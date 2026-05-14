import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
    const id = ref(1)
    const username = ref('cl')
    const photo = ref('http://127.0.0.1:8000/media/user/photos/default.png')
    const profile = ref('111')
    const accessToken = ref('111')


    interface UserInfo {
      user_id: number
      username: string
      photo: string
      profile: string
}

    function isLogin(){
        return !!accessToken.value  // 必须带value!!!!
    }

    function setAccessToken(token:string){
        accessToken.value = token
    }

    function setUserInfo(data:UserInfo){
        id.value = data.user_id
        username.value = data.username
        photo.value = data.photo
        profile.value = data.profile
    }

    function logout(){
        id.value = 0
        username.value = ''
        photo.value = ''
        profile.value = ''
        accessToken.value = ''
    }

    return{
        id,
        username,
        photo,
        profile,
        accessToken,    // 千万不要忘了
        setAccessToken,
        isLogin,
        setUserInfo,
        logout,
    }
})
