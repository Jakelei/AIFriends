/*
 * 功能：在每个请求头里自动添加`access token`。
 * 然后拦截请求结果，如果返回结果是身份认证失败（401），
 * 则说明`access_token`过期了，
 * 那么先用`cookie`中的`refresh_token`刷新`access_token`。
 * 如果刷新失败则说明`refresh_token`也过期了，
 * 则调用`user.logout()`在浏览器内存中删除登录状态；
 * 如果刷新成功，则重新发送原请求。
*/

import axios from "axios"
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { useUserStore } from "@/stores/user.ts";

const BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// 请求拦截器：自动添加 access token
api.interceptors.request.use((config) => {
  const user = useUserStore();
  if (user.accessToken) {
    config.headers!.Authorization = `Bearer ${user.accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string | null, error?: any) => void)[] = [];

// 订阅刷新事件
function subscribeTokenRefresh(
  callback: (token: string | null, error?: any) => void
) {
  refreshSubscribers.push(callback);
}

// 刷新成功后执行所有订阅
function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// 刷新失败后执行所有订阅
function onRefreshFailed(err: any) {
  refreshSubscribers.forEach((cb) => cb(null, err));
  refreshSubscribers = [];
}

// 响应拦截器：处理 401 无感刷新
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const user = useUserStore();
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 401 且未重试过
    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token, err) => {
          if (err) {
            reject(err);
          } else if (token) {
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          }
        });

        if (!isRefreshing) {
          isRefreshing = true;
          axios
            .post(
              `${BASE_URL}/api/user/account/refresh_token/`,
              {},
              { withCredentials: true, timeout: 5000 }
            )
            .then((res) => {
              const newToken = res.data.access;
              user.setAccessToken(newToken);
              onRefreshed(newToken);
            })
            .catch((err) => {
              user.logout();
              onRefreshFailed(err);
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        }
      });
    }

    return Promise.reject(error);
  }
);

export default api;





