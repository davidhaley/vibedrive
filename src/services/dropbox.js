import { Dropbox } from 'dropbox'
import constants from '@/constants'

class DropboxService {
  constructor () {
    this.$dbx = new Dropbox({ clientId: constants.DROPBOX_CLIENT_ID })

    this.authenticationURL = this.$dbx.getAuthenticationUrl(constants.URL + '/dbx')
  }

  set token (accessToken) {
    this.$dbx.setAccessToken(accessToken)
  }

  isConnected () {
    return !!this.$dbx.getAccessToken()
  }

  upload (file) {
    return this.$dbx.filesUpload({ 
      path: '/Inbox' + file.name, 
      contents: file 
    })
  }

  listFiles () {
    return this.$dbx.filesListFolder({ path: '/Inbox' })
  }
}

export default new DropboxService()
