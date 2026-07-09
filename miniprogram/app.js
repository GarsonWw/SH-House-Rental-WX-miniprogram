// app.js
// 云开发环境 ID
const CLOUD_ENV = 'cloud1-d5gtn67zydd66b8de'
const getCloudConfig = () => CLOUD_ENV ? { env: CLOUD_ENV } : {}

const HOUSE_PAGE_SIZE = 20
const HOUSE_FRESH_INTERVAL = 15000
const LUOHU_AREAS = ['罗湖口岸', '国贸', '东门', '黄贝岭', '翠竹', '笋岗', '银湖', '蔡屋围', '莲塘', '水贝', '布心', '清水河', '其他片区']
const LUOHU_AREA_KEYWORDS = [
  ['罗湖口岸', ['罗湖口岸', '口岸']],
  ['国贸', ['国贸']],
  ['东门', ['东门']],
  ['黄贝岭', ['黄贝岭', '深业东岭']],
  ['翠竹', ['翠竹', '锦湖逸园']],
  ['笋岗', ['笋岗']],
  ['银湖', ['银湖']],
  ['蔡屋围', ['蔡屋围', '京基东方都会', '大剧院']],
  ['莲塘', ['莲塘']],
  ['水贝', ['水贝']],
  ['布心', ['布心']],
  ['清水河', ['清水河']]
]

const getLuohuArea = house => {
  const current = String((house && house.district) || '').trim()
  if (LUOHU_AREAS.includes(current)) return current
  const searchable = [house && house.neighborhood, house && house.address, house && house.locationName, current]
    .filter(Boolean)
    .join('')
  const matched = LUOHU_AREA_KEYWORDS.find(([, keywords]) => keywords.some(keyword => searchable.includes(keyword)))
  return matched ? matched[0] : '其他片区'
}

const resolveHouseDistrict = house => {
  const raw = String((house && house.district) || '').trim()
  if (LUOHU_AREAS.includes(raw)) return raw
  return getLuohuArea(house)
}

const getDistrictFilterOptions = (houseList, allLabel = '全部') => {
  const used = new Set()
  ;(houseList || []).forEach(house => {
    const district = resolveHouseDistrict(house)
    if (district) used.add(district)
  })
  return [allLabel, ...LUOHU_AREAS.filter(district => used.has(district))]
}
const NEIGHBORHOOD_FIELDS = [
  'neighborhoodNote',
  'neighborhoodReview',
  'neighborhoodCover',
  'neighborhoodImages',
  'neighborhoodVideos',
  'neighborhoodVideoCover',
  'neighborhoodSlogan',
  'commuteInfo',
  'commuteMode',
  'safetyInfo',
  'propertyType',
  'parkingInfo',
  'deliveryInfo',
  'shortRentInfo',
  'roomInsight',
  'priceReference',
  'waterElectricFee',
  'broadbandFee',
  'parkingFee',
  'surroundings',
  'suitableCrowd',
  'scoutTitle',
  'scoutSummary',
  'scoutAdvice',
  'district',
  'latitude',
  'longitude',
  'locationName'
]

const stripNeighborhoodFields = source => {
  const data = { ...(source || {}) }
  NEIGHBORHOOD_FIELDS.forEach(field => delete data[field])
  return data
}

App({
  globalData: {
    // 房源数据
    houseList: [],
    neighborhoodList: [],
    neighborhoodProfiles: {},
    houseListLoaded: false,
    houseLoadCallbacks: [],
    lastHouseSyncAt: 0,
    houseDataStale: false,

    // 用户登录
    openid: null,
    userProfile: null,       // { nickName, avatarUrl }
    loginReady: false,
    loginError: null,
    loginCallbacks: [],

    // 收藏（云同步）
    favoriteIds: [],         // [houseId, ...]，登录后从云端加载

    // 管理员模式
    isLandlord: false,
    landlordStatusReady: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库')
      return
    }
    wx.cloud.init({ ...getCloudConfig(), traceUser: true })

    // 恢复本地缓存的用户信息（避免每次冷启都等云函数）
    const cachedProfile = wx.getStorageSync('userProfile')
    const cachedOpenid  = wx.getStorageSync('openid')
    if (cachedOpenid) {
      this.globalData.openid      = cachedOpenid
      this.globalData.userProfile = cachedProfile || null
    }

    // 并行启动：登录 + 加载房源
    this.silentLogin()
    this.loadHousesFromCloud()
  },

  // ── 登录 ────────────────────────────────────────────────
  silentLogin() {
    wx.cloud.callFunction({
      name: 'login',
      config: getCloudConfig()
    })
      .then(res => {
        const { openid } = res.result
        this.globalData.openid     = openid
        this.globalData.loginReady = true
        this.globalData.loginError = null
        wx.setStorageSync('openid', openid)
        this._flushLoginCallbacks()
        this._loadFavoriteIds()
        this.refreshLandlordStatus()
      })
      .catch(err => {
        console.error('[Login] 登录失败', err)
        // 无论成功与否，都标记为就绪，避免回调永远挂起
        this.globalData.loginReady = true
        this.globalData.loginError = err
        this._flushLoginCallbacks()
        if (this.globalData.openid) {
          this._loadFavoriteIds()
        }
      })
  },

  retryLogin(cb) {
    this.globalData.loginReady = false
    this.globalData.loginError = null
    if (cb) this.globalData.loginCallbacks.push(cb)
    this.silentLogin()
  },

  onLoginReady(cb) {
    if (this.globalData.loginReady) {
      cb(this.globalData.openid, this.globalData.loginError)
    } else {
      this.globalData.loginCallbacks.push(cb)
    }
  },

  _flushLoginCallbacks() {
    this.globalData.loginCallbacks.forEach(cb => cb(this.globalData.openid, this.globalData.loginError))
    this.globalData.loginCallbacks = []
  },

  // 用户主动设置昵称/头像（wx.getUserProfile 需要用户手势触发）
  setUserProfile(profile) {
    this.globalData.userProfile = profile
    wx.setStorageSync('userProfile', profile)
  },

  exitLandlord() {
    this.globalData.isLandlord = false
  },

  callHouseService(action, data = {}) {
    return wx.cloud.callFunction({
      name: 'houseService',
      data: { action, ...data },
      config: getCloudConfig()
    }).then(res => {
      const result = res.result || {}
      if (!result.ok) {
        const error = new Error(result.message || '房源服务请求失败')
        error.code = result.code || 'SERVICE_ERROR'
        throw error
      }
      return result
    })
  },

  refreshLandlordStatus(callback) {
    if (!this.globalData.openid) {
      this.globalData.isLandlord = false
      this.globalData.landlordStatusReady = true
      if (callback) callback(false, this.globalData.loginError)
      return
    }
    this.callHouseService('getAdminStatus')
      .then(result => {
        this.globalData.isLandlord = !!result.isAdmin
        this.globalData.landlordStatusReady = true
        if (callback) callback(this.globalData.isLandlord, null, result.openid)
      })
      .catch(error => {
        this.globalData.isLandlord = false
        this.globalData.landlordStatusReady = true
        if (callback) callback(false, error, this.globalData.openid)
      })
  },

  requireLandlord(callback) {
    this.onLoginReady((openid, loginError) => {
      if (!openid) {
        callback(false, loginError || new Error('登录尚未完成'))
        return
      }
      this.refreshLandlordStatus((isLandlord, error) => callback(isLandlord, error))
    })
  },

  // ── 房源数据 ────────────────────────────────────────────
  _fetchAll(collectionName, orderField) {
    const db = wx.cloud.database()
    const loadPage = skip => {
      let query = db.collection(collectionName)
      if (orderField) query = query.orderBy(orderField, 'desc')
      return query.skip(skip).limit(HOUSE_PAGE_SIZE).get().then(res => {
        const rows = res.data || []
        if (rows.length < HOUSE_PAGE_SIZE) return rows
        return loadPage(skip + rows.length).then(next => rows.concat(next))
      })
    }
    return loadPage(0)
  },

  _applyNeighborhoodProfile(house) {
    const profile = this.globalData.neighborhoodProfiles[house.neighborhood]
    if (!profile) return house
    const overlay = {}
    NEIGHBORHOOD_FIELDS.forEach(field => {
      if (profile[field] !== undefined && profile[field] !== null && profile[field] !== '') {
        overlay[field] = profile[field]
      }
    })
    return { ...house, ...overlay }
  },

  _normalizeHouseRecord(house) {
    const profiled = this._applyNeighborhoodProfile({ ...house, id: house.id || house._id })
    return { ...profiled, district: resolveHouseDistrict(profiled) }
  },

  resolveHouseDistrict(house) {
    return resolveHouseDistrict(house)
  },

  getDistrictFilterOptions(houseList, allLabel = '全部') {
    return getDistrictFilterOptions(houseList, allLabel)
  },

  loadHousesFromCloud() {
    if (this._houseRefreshPromise) return this._houseRefreshPromise
    this._houseRefreshPromise = Promise.all([
      this._fetchAll('houses', 'createTime'),
      this._fetchAll('neighborhoods', 'updatedAt').catch(() => [])
    ])
      .then(([houseRows, neighborhoodRows]) => {
        const profiles = {}
        neighborhoodRows.forEach(profile => {
          if (profile && profile.name) profiles[profile.name] = { ...profile, id: profile._id }
        })
        this.globalData.neighborhoodProfiles = profiles
        const list = houseRows.map(h => this._normalizeHouseRecord({ ...h, id: h._id }))
        this.globalData.houseList = list
        this.globalData.houseListLoaded = true
        this.globalData.lastHouseSyncAt = Date.now()
        this.globalData.houseDataStale = false
        this._staleNoticeShown = false
        this.refreshNeighborhoodList()
        this._flushHouseCallbacks()
        wx.setStorageSync('houseList_cache', list)
        wx.setStorageSync('neighborhoodProfiles_cache', profiles)
        return list
      })
      .catch(err => {
        console.error('[Cloud] 加载房源失败', err)
        const cached = (wx.getStorageSync('houseList_cache') || []).map(h => this._normalizeHouseRecord(h))
        this.globalData.neighborhoodProfiles = wx.getStorageSync('neighborhoodProfiles_cache') || {}
        this.globalData.houseList = cached
        this.globalData.houseListLoaded = true
        this.globalData.houseDataStale = true
        this.refreshNeighborhoodList()
        this._flushHouseCallbacks(err)
        if (!this._staleNoticeShown) {
          this._staleNoticeShown = true
          wx.showToast({ title: '网络异常，当前展示缓存房源', icon: 'none', duration: 2500 })
        }
        return cached
      })
      .finally(() => { this._houseRefreshPromise = null })
    return this._houseRefreshPromise
  },

  refreshHouses(callback) {
    this.globalData.houseListLoaded = false
    if (callback) this.globalData.houseLoadCallbacks.push(callback)
    return this.loadHousesFromCloud()
  },

  ensureHousesFresh(callback, maxAge = HOUSE_FRESH_INTERVAL) {
    const age = Date.now() - Number(this.globalData.lastHouseSyncAt || 0)
    if (!this.globalData.houseListLoaded) {
      this.onHouseListReady(callback)
      return
    }
    if (this.globalData.houseDataStale || age > maxAge) {
      this.refreshHouses(callback)
      return
    }
    callback()
  },

  onHouseListReady(cb) {
    if (this.globalData.houseListLoaded) {
      cb()
    } else {
      this.globalData.houseLoadCallbacks.push(cb)
    }
  },

  _flushHouseCallbacks(error) {
    this.globalData.houseLoadCallbacks.forEach(cb => cb(error))
    this.globalData.houseLoadCallbacks = []
  },

  buildNeighborhoodIndex() {
    const map = {}
    const ensure = name => {
      const trimmed = String(name || '').trim()
      if (!trimmed) return null
      if (!map[trimmed]) {
        const profile = this.globalData.neighborhoodProfiles[trimmed] || {}
        map[trimmed] = {
          name: trimmed,
          district: profile.district || '',
          count: 0,
          available: 0,
          hasProfile: Object.prototype.hasOwnProperty.call(this.globalData.neighborhoodProfiles, trimmed)
        }
      }
      return map[trimmed]
    }

    Object.keys(this.globalData.neighborhoodProfiles).forEach(name => ensure(name))
    this.globalData.houseList.forEach(h => {
      const entry = ensure(h.neighborhood)
      if (!entry) return
      if (!entry.district && h.district) entry.district = h.district
      entry.count += 1
      if (h.available !== false) entry.available += 1
    })
    Object.values(map).forEach(entry => {
      entry.district = resolveHouseDistrict({
        neighborhood: entry.name,
        district: entry.district
      })
    })
    return map
  },

  getMergedNeighborhoodSummaries() {
    return Object.values(this.buildNeighborhoodIndex())
      .map(entry => ({
        ...entry,
        district: entry.district || '其他片区'
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  },

  getNeighborhoodNameList() {
    return this.getMergedNeighborhoodSummaries().map(item => item.name)
  },

  isNeighborhoodNameTaken(name, exceptName = '') {
    const trimmed = String(name || '').trim()
    const skip = String(exceptName || '').trim()
    if (!trimmed) return false
    return this.getNeighborhoodNameList().some(item => item === trimmed && item !== skip)
  },

  refreshNeighborhoodList() {
    const map = {}
    this.getMergedNeighborhoodSummaries().forEach(entry => {
      const profile = this.globalData.neighborhoodProfiles[entry.name] || {}
      const sampleHouse = this.globalData.houseList.find(h => h.neighborhood === entry.name) || {}
      map[entry.name] = {
        name: entry.name,
        count: entry.count,
        district: entry.district || '未知区域',
        coverImg: (profile.neighborhoodImages && profile.neighborhoodImages[0])
          || profile.neighborhoodCover
          || sampleHouse.neighborhoodCover
          || (sampleHouse.images && sampleHouse.images[0] ? sampleHouse.images[0] : ''),
        note: profile.neighborhoodNote || sampleHouse.neighborhoodNote || sampleHouse.neighborhoodDesc || '',
        review: profile.neighborhoodReview || sampleHouse.neighborhoodReview || '',
        commuteInfo: profile.commuteInfo || sampleHouse.commuteInfo || '',
        propertyType: profile.propertyType || sampleHouse.propertyType || '',
        parkingInfo: profile.parkingInfo || sampleHouse.parkingInfo || '',
        priceReference: profile.priceReference || sampleHouse.priceReference || '',
        waterElectricFee: profile.waterElectricFee || sampleHouse.waterElectricFee || '',
        broadbandFee: profile.broadbandFee || sampleHouse.broadbandFee || '',
        parkingFee: profile.parkingFee || sampleHouse.parkingFee || ''
      }
    })
    this.globalData.neighborhoodList = Object.values(map)
  },

  addHouse(data, callback) {
    const houseData = {
      ...stripNeighborhoodFields(data),
      price: Number(data.price),
      area: Number(data.area),
      viewCount: 0,
      available: data.available !== false,
      createTime: new Date()
    }
    this.callHouseService('createHouse', { data: houseData })
      .then(result => {
        const newHouse = this._normalizeHouseRecord({ ...houseData, _id: result.id, id: result.id, version: result.version })
        this.globalData.houseList.unshift(newHouse)
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(newHouse, null)
      })
      .catch(err => {
        console.error('[Cloud] 发布失败', err)
        if (callback) callback(null, err)
      })
  },

  deleteHouse(id, callback) {
    const house = this.getHouseById(id)
    this.callHouseService('deleteHouse', { id, expectedVersion: house && house.version })
      .then(() => {
        this.globalData.houseList = this.globalData.houseList.filter(h => h.id !== id)
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(null)
      })
      .catch(err => {
        if (callback) callback(err)
      })
  },

  toggleHouseStatus(id, available, callback) {
    const house = this.getHouseById(id)
    this.callHouseService('toggleStatus', { id, available, expectedVersion: house && house.version })
      .then(result => {
        if (house) {
          house.available = available
          house.version = result.version
        }
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(null)
      })
      .catch(err => { if (callback) callback(err) })
  },

  incrementViewCount(id) {
    const house = this.getHouseById(id)
    this.callHouseService('incrementView', { id })
      .then(result => {
        if (house && result.counted) house.viewCount = (house.viewCount || 0) + 1
      })
      .catch(() => {})
  },

  getHouseById(id) {
    return this.globalData.houseList.find(h => h.id === id)
  },

  getHousesByNeighborhood(name) {
    return this.globalData.houseList.filter(h => h.neighborhood === name)
  },

  getHouseFresh(id, callback) {
    const db = wx.cloud.database()
    db.collection('houses').doc(id).get()
      .then(res => {
        const fresh = this._normalizeHouseRecord({ ...res.data, id: res.data._id })
        const index = this.globalData.houseList.findIndex(h => h.id === id)
        if (index > -1) this.globalData.houseList[index] = fresh
        else this.globalData.houseList.unshift(fresh)
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        callback(fresh, null)
      })
      .catch(error => callback(null, error))
  },

  getMyHouses(callback) {
    if (!this.globalData.isLandlord) {
      callback([], new Error('无管理权限'))
      return
    }
    this.ensureHousesFresh(error => callback([...this.globalData.houseList], error), 0)
  },

  updateHouse(id, data, callback) {
    const house = this.getHouseById(id)
    const houseData = stripNeighborhoodFields(data)
    this.callHouseService('updateHouse', { id, data: houseData, expectedVersion: house && house.version })
      .then(result => {
        if (house) {
          Object.assign(house, houseData, { version: result.version })
          Object.assign(house, this._normalizeHouseRecord(house))
        }
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(null)
      })
      .catch(err => { if (callback) callback(err) })
  },

  getNeighborhoodProfile(name) {
    return this.globalData.neighborhoodProfiles[name] || null
  },

  getNeighborhoodLocation(name) {
    const profile = this.getNeighborhoodProfile(name) || {}
    return {
      district: profile.district || '',
      latitude: profile.latitude,
      longitude: profile.longitude,
      locationName: profile.locationName || '',
      address: profile.address || ''
    }
  },

  hasNeighborhoodLocation(name) {
    const location = this.getNeighborhoodLocation(name)
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    return Number.isFinite(latitude) && latitude !== 0 && Number.isFinite(longitude) && longitude !== 0
  },

  saveNeighborhood(name, data, callback) {
    const current = this.getNeighborhoodProfile(name)
    this.callHouseService('saveNeighborhood', {
      name,
      data,
      expectedVersion: current && current.version
    })
      .then(result => {
        const profile = { ...(current || {}), ...data, name, id: result.id, version: result.version }
        this.globalData.neighborhoodProfiles[name] = profile
        const locationPatch = {
          district: profile.district,
          latitude: profile.latitude,
          longitude: profile.longitude,
          locationName: profile.locationName,
          address: profile.address
        }
        this.globalData.houseList = this.globalData.houseList.map(house => {
          if (house.neighborhood !== name) return house
          return this._normalizeHouseRecord(this._applyNeighborhoodProfile({ ...house, ...locationPatch }))
        })
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        wx.setStorageSync('neighborhoodProfiles_cache', this.globalData.neighborhoodProfiles)
        if (callback) callback(null, profile)
      })
      .catch(error => { if (callback) callback(error) })
  },

  deleteNeighborhood(name, callback) {
    this.callHouseService('deleteNeighborhood', { name })
      .then(result => {
        delete this.globalData.neighborhoodProfiles[name]
        this.refreshNeighborhoodList()
        wx.setStorageSync('neighborhoodProfiles_cache', this.globalData.neighborhoodProfiles)
        if (callback) callback(null, result)
      })
      .catch(error => { if (callback) callback(error) })
  },

  renameNeighborhood(oldName, newName, callback) {
    const from = String(oldName || '').trim()
    const to = String(newName || '').trim()
    if (!from || !to) {
      const error = new Error('小区名称不能为空')
      error.code = 'INVALID_DATA'
      if (callback) callback(error)
      return
    }
    if (from === to) {
      if (callback) callback(null, { oldName: from, newName: to, renamed: false })
      return
    }
    this.callHouseService('renameNeighborhood', { oldName: from, newName: to })
      .then(result => {
        const oldProfile = this.getNeighborhoodProfile(from) || {}
        delete this.globalData.neighborhoodProfiles[from]
        this.globalData.neighborhoodProfiles[to] = {
          ...oldProfile,
          name: to,
          id: result.id,
          version: result.version
        }
        this.globalData.houseList = this.globalData.houseList.map(house => {
          if (house.neighborhood !== from) return house
          return this._normalizeHouseRecord({ ...house, neighborhood: to })
        })
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        wx.setStorageSync('neighborhoodProfiles_cache', this.globalData.neighborhoodProfiles)
        if (callback) callback(null, result)
      })
      .catch(error => { if (callback) callback(error) })
  },

  getCloudErrorMessage(err, fallback = '云服务请求失败') {
    if (!err) return fallback
    return err.errMsg || err.message || JSON.stringify(err)
  },

  // ── 媒体上传 ────────────────────────────────────────────
  uploadImages(tempPaths, callback, folder = 'houses') {
    if (!tempPaths || tempPaths.length === 0) { callback([], null); return }
    if (!this.globalData.isLandlord) {
      const error = new Error('当前微信账号没有上传房源媒体的权限')
      error.code = 'FORBIDDEN'
      callback([], error)
      return
    }
    Promise.allSettled(tempPaths.map((filePath, index) => {
      const cleanPath = String(filePath || '').split('?')[0]
      const extMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/)
      const ext = extMatch ? extMatch[1] : 'jpg'
      const cloudPath = `${folder}/${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}.${ext}`
      return wx.cloud.uploadFile({
        cloudPath,
        filePath,
        config: getCloudConfig()
      }).then(r => r.fileID)
    }))
      .then(results => {
        const ids = results.filter(result => result.status === 'fulfilled').map(result => result.value)
        const failed = results.find(result => result.status === 'rejected')
        if (!failed) {
          callback(ids, null)
          return
        }
        console.error('[Cloud] 媒体上传失败', failed.reason)
        this.deleteUploadedFiles(ids, () => callback([], failed.reason))
      })
  },

  deleteUploadedFiles(fileList, callback) {
    if (!fileList || !fileList.length) {
      if (callback) callback()
      return
    }
    this.callHouseService('deleteFiles', { fileList })
      .catch(() => {})
      .finally(() => { if (callback) callback() })
  },

  // ── 收藏（云同步）──────────────────────────────────────
  _favoriteCacheKey() {
    return `favorites_${this.globalData.openid || 'anonymous'}`
  },

  _setFavoriteIds(ids) {
    this.globalData.favoriteIds = [...new Set(Array.isArray(ids) ? ids.filter(Boolean) : [])]
    wx.setStorageSync(this._favoriteCacheKey(), this.globalData.favoriteIds)
  },

  _loadFavoriteIds() {
    // 只有登录后才能加载云收藏
    if (!this.globalData.openid) return
    this._fetchAll('favorites')
      .then(rows => {
        this._setFavoriteIds(rows.map(d => d.houseId))
      })
      .catch(() => {
        // 降级到本地缓存
        this.globalData.favoriteIds = wx.getStorageSync(this._favoriteCacheKey()) || []
      })
  },

  isFavorited(id) {
    return this.globalData.favoriteIds.includes(id)
  },

  toggleFavorite(id, callback) {
    if (!this.globalData.openid) {
      const error = new Error('请先登录后收藏')
      error.code = 'LOGIN_REQUIRED'
      if (callback) callback(this.isFavorited(id), error)
      return
    }
    this._favoritePendingIds = this._favoritePendingIds || new Set()
    if (this._favoritePendingIds.has(id)) {
      const error = new Error('收藏操作正在进行')
      error.code = 'PENDING'
      if (callback) callback(this.isFavorited(id), error)
      return
    }
    this._favoritePendingIds.add(id)
    const ids = [...this.globalData.favoriteIds]
    const idx = ids.indexOf(id)
    const db  = wx.cloud.database()
    let operation
    let nextFavorited
    if (idx > -1) {
      operation = db.collection('favorites').where({ houseId: id }).remove()
      nextFavorited = false
    } else {
      operation = db.collection('favorites').add({ data: { houseId: id, createdAt: db.serverDate() } })
      nextFavorited = true
    }
    operation
      .then(() => {
        const nextIds = nextFavorited ? [id, ...ids] : ids.filter(item => item !== id)
        this._setFavoriteIds(nextIds)
        if (callback) callback(nextFavorited, null)
      })
      .catch(error => {
        console.error('[Favorites] 收藏同步失败', error)
        if (callback) callback(this.isFavorited(id), error)
      })
      .finally(() => this._favoritePendingIds.delete(id))
  },

  getFavoriteHouses() {
    return this.globalData.favoriteIds
      .map(id => this.getHouseById(id))
      .filter(Boolean)
  },

  // 重新从云端拉取收藏（用于收藏夹页面刷新）
  reloadFavorites(callback) {
    if (!this.globalData.openid) {
      if (callback) callback(new Error('尚未登录'))
      return
    }
    this._fetchAll('favorites')
      .then(rows => {
        this._setFavoriteIds(rows.map(d => d.houseId))
        if (callback) callback(null)
      })
      .catch(error => { if (callback) callback(error) })
  }
})
