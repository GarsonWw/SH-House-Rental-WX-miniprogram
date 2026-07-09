const DEFAULT_CENTER = { latitude: 22.5550, longitude: 114.1200 }

const runChooseLocation = options => {
  wx.chooseLocation({
    latitude: options.latitude || DEFAULT_CENTER.latitude,
    longitude: options.longitude || DEFAULT_CENTER.longitude,
    success: options.success,
    fail: options.fail
  })
}

const chooseMapLocation = options => {
  const invoke = () => runChooseLocation(options)

  if (typeof wx.requirePrivacyAuthorize === 'function') {
    wx.requirePrivacyAuthorize({
      success: invoke,
      fail: err => {
        if (options.fail) options.fail(err || { errMsg: 'requirePrivacyAuthorize:fail' })
      }
    })
    return
  }

  invoke()
}

const openMapLocation = ({ latitude, longitude, name, address }) => {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  wx.openLocation({
    latitude: lat,
    longitude: lng,
    name: name || '小区位置',
    address: address || '',
    scale: 16
  })
  return true
}

module.exports = {
  DEFAULT_CENTER,
  chooseMapLocation,
  openMapLocation
}
