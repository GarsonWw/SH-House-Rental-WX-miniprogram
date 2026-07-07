const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const BOOTSTRAP_ADMIN_OPENIDS = [
  'oA0h43eQhrZqdISgjJctd-hswB_A',
  'oA0h43Qs4oEFUers_O1EB5aTGLnc'
]

const protectedHouseFields = [
  '_id',
  'id',
  '_openid',
  'createdBy',
  'createTime',
  'updatedBy',
  'updatedAt',
  'version'
]

const neighborhoodFields = [
  'neighborhoodNote', 'neighborhoodReview', 'neighborhoodCover', 'neighborhoodSlogan',
  'commuteInfo', 'commuteMode', 'safetyInfo', 'propertyType', 'parkingInfo', 'deliveryInfo',
  'shortRentInfo', 'roomInsight', 'priceReference', 'waterElectricFee', 'broadbandFee',
  'parkingFee', 'surroundings', 'suitableCrowd', 'scoutTitle', 'scoutSummary', 'scoutAdvice'
]

const makeError = (code, message) => {
  const error = new Error(message)
  error.code = code
  return error
}

const getAdminOpenids = () => [
  ...BOOTSTRAP_ADMIN_OPENIDS,
  ...String(process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
]

const isAdmin = async openid => {
  if (!openid) return false
  try {
    const result = await db.collection('admins').doc(openid).get()
    return !!(result.data && result.data.enabled !== false)
  } catch (error) {
    const allowed = getAdminOpenids().includes(openid)
    if (!allowed) return false
    try {
      await db.collection('admins').doc(openid).set({
        data: {
          enabled: true,
          name: '首位管理员',
          source: 'server-bootstrap',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    } catch (writeError) {
      console.error('[houseService] 自动写入管理员记录失败', writeError)
    }
    return true
  }
}

const requireAdmin = async openid => {
  if (!await isAdmin(openid)) {
    throw makeError('FORBIDDEN', '当前微信账号不是房源管理员')
  }
}

const sanitizeHouseData = source => {
  const data = { ...(source || {}) }
  protectedHouseFields.forEach(field => delete data[field])
  neighborhoodFields.forEach(field => delete data[field])
  data.price = Number(data.price)
  data.area = Number(data.area)
  if (data.latitude !== '' && data.latitude !== undefined) data.latitude = Number(data.latitude)
  if (data.longitude !== '' && data.longitude !== undefined) data.longitude = Number(data.longitude)
  data.images = Array.isArray(data.images) ? data.images : []
  data.videos = Array.isArray(data.videos) ? data.videos : []
  data.tags = Array.isArray(data.tags) ? data.tags : []
  return data
}

const validateHouse = data => {
  if (!String(data.neighborhood || '').trim()) throw makeError('INVALID_DATA', '小区名称不能为空')
  if (!String(data.title || '').trim()) throw makeError('INVALID_DATA', '房源标题不能为空')
  if (!Number.isFinite(data.price) || data.price <= 0) throw makeError('INVALID_DATA', '租金格式不正确')
  if (!Number.isFinite(data.area) || data.area <= 0) throw makeError('INVALID_DATA', '面积格式不正确')
}

const assertVersion = (current, expectedVersion) => {
  const missingExpected = expectedVersion === undefined || expectedVersion === null || expectedVersion === ''
  if (missingExpected && current.version === undefined) return
  const currentVersion = Number(current.version || 0)
  if (missingExpected || currentVersion !== Number(expectedVersion)) {
    throw makeError('CONFLICT', '数据已被其他设备更新，请刷新后重试')
  }
}

const collectCloudFiles = house => [
  ...(Array.isArray(house.images) ? house.images : []),
  ...(Array.isArray(house.videos) ? house.videos : []),
  house.videoCover
].filter(path => typeof path === 'string' && path.startsWith('cloud://'))

const deleteCloudFiles = async fileList => {
  const uniqueFiles = [...new Set(fileList || [])]
  if (!uniqueFiles.length) return
  try {
    await cloud.deleteFile({ fileList: uniqueFiles })
  } catch (error) {
    console.error('[houseService] 删除旧媒体失败', error)
  }
}

const neighborhoodId = name => crypto
  .createHash('sha1')
  .update(String(name || '').trim())
  .digest('hex')

const createHouse = async (openid, event) => {
  await requireAdmin(openid)
  const data = sanitizeHouseData(event.data)
  validateHouse(data)
  const payload = {
    ...data,
    available: data.available !== false,
    viewCount: 0,
    version: 1,
    createdBy: openid,
    updatedBy: openid,
    createTime: db.serverDate(),
    updatedAt: db.serverDate()
  }
  try {
    const result = await db.collection('houses').add({ data: payload })
    return { id: result._id, version: 1 }
  } catch (error) {
    await deleteCloudFiles(collectCloudFiles(data))
    throw error
  }
}

const updateHouse = async (openid, event) => {
  await requireAdmin(openid)
  const id = String(event.id || '')
  if (!id) throw makeError('INVALID_DATA', '缺少房源 ID')
  const data = sanitizeHouseData(event.data)
  validateHouse(data)
  let removedFiles = []
  let addedFiles = []
  let nextVersion = 1

  try {
    await db.runTransaction(async transaction => {
      const reference = transaction.collection('houses').doc(id)
      const result = await reference.get()
      const current = result.data
      if (!current) throw makeError('NOT_FOUND', '房源不存在')
      const oldFiles = collectCloudFiles(current)
      const oldFileSet = new Set(oldFiles)
      const nextFiles = collectCloudFiles(data)
      const nextFileSet = new Set(nextFiles)
      addedFiles = nextFiles.filter(file => !oldFileSet.has(file))
      removedFiles = oldFiles.filter(file => !nextFileSet.has(file))
      assertVersion(current, event.expectedVersion)
      nextVersion = Number(current.version || 0) + 1
      await reference.update({
        data: {
          ...data,
          ...neighborhoodFields.reduce((fields, field) => ({ ...fields, [field]: _.remove() }), {}),
          version: nextVersion,
          updatedBy: openid,
          updatedAt: db.serverDate()
        }
      })
    })
  } catch (error) {
    await deleteCloudFiles(addedFiles)
    throw error
  }

  await deleteCloudFiles(removedFiles)
  return { id, version: nextVersion }
}

const toggleStatus = async (openid, event) => {
  await requireAdmin(openid)
  const id = String(event.id || '')
  if (!id) throw makeError('INVALID_DATA', '缺少房源 ID')
  let nextVersion = 1

  await db.runTransaction(async transaction => {
    const reference = transaction.collection('houses').doc(id)
    const result = await reference.get()
    const current = result.data
    if (!current) throw makeError('NOT_FOUND', '房源不存在')
    assertVersion(current, event.expectedVersion)
    nextVersion = Number(current.version || 0) + 1
    await reference.update({
      data: {
        available: event.available === true,
        version: nextVersion,
        updatedBy: openid,
        updatedAt: db.serverDate()
      }
    })
  })

  return { id, available: event.available === true, version: nextVersion }
}

const deleteHouse = async (openid, event) => {
  await requireAdmin(openid)
  const id = String(event.id || '')
  if (!id) throw makeError('INVALID_DATA', '缺少房源 ID')
  let files = []

  await db.runTransaction(async transaction => {
    const reference = transaction.collection('houses').doc(id)
    const result = await reference.get()
    const current = result.data
    if (!current) throw makeError('NOT_FOUND', '房源不存在')
    assertVersion(current, event.expectedVersion)
    files = collectCloudFiles(current)
    await reference.remove()
  })

  await deleteCloudFiles(files)
  return { id }
}

const incrementView = async (openid, event) => {
  const id = String(event.id || '')
  if (!id) throw makeError('INVALID_DATA', '缺少房源 ID')
  const day = new Date().toISOString().slice(0, 10)
  const viewId = crypto.createHash('sha1').update(`${id}:${openid}:${day}`).digest('hex')
  let counted = false
  await db.runTransaction(async transaction => {
    const viewReference = transaction.collection('houseViews').doc(viewId)
    try {
      const existing = await viewReference.get()
      if (existing.data) return
    } catch (error) {
      // 当天尚未浏览时继续计数。
    }
    await viewReference.set({
      data: {
        houseId: id,
        viewer: openid,
        day,
        createTime: db.serverDate()
      }
    })
    await transaction.collection('houses').doc(id).update({
      data: { viewCount: _.inc(1) }
    })
    counted = true
  })
  return { id, counted }
}

const saveNeighborhood = async (openid, event) => {
  await requireAdmin(openid)
  const name = String(event.name || '').trim()
  if (!name) throw makeError('INVALID_DATA', '小区名称不能为空')
  const id = neighborhoodId(name)
  const data = { ...(event.data || {}) }
  ;['_id', 'id', '_openid', 'name', 'version', 'updatedAt', 'updatedBy'].forEach(field => delete data[field])
  let nextVersion = 1

  await db.runTransaction(async transaction => {
    const reference = transaction.collection('neighborhoods').doc(id)
    let current = null
    try {
      const result = await reference.get()
      current = result.data
    } catch (error) {
      current = null
    }

    if (current) {
      assertVersion(current, event.expectedVersion)
      nextVersion = Number(current.version || 0) + 1
      await reference.update({
        data: {
          ...data,
          name,
          version: nextVersion,
          updatedBy: openid,
          updatedAt: db.serverDate()
        }
      })
    } else {
      nextVersion = 1
      await reference.set({
        data: {
          ...data,
          name,
          version: 1,
          updatedBy: openid,
          updatedAt: db.serverDate()
        }
      })
    }
  })

  return { id, name, version: nextVersion }
}

const deleteFiles = async (openid, event) => {
  await requireAdmin(openid)
  const fileList = (Array.isArray(event.fileList) ? event.fileList : [])
    .filter(path => typeof path === 'string' && path.startsWith('cloud://'))
  await deleteCloudFiles(fileList)
  return { deleted: fileList.length }
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  try {
    let data
    switch (event.action) {
      case 'getAdminStatus':
        data = { isAdmin: await isAdmin(OPENID), openid: OPENID }
        break
      case 'createHouse':
        data = await createHouse(OPENID, event)
        break
      case 'updateHouse':
        data = await updateHouse(OPENID, event)
        break
      case 'toggleStatus':
        data = await toggleStatus(OPENID, event)
        break
      case 'deleteHouse':
        data = await deleteHouse(OPENID, event)
        break
      case 'incrementView':
        data = await incrementView(OPENID, event)
        break
      case 'saveNeighborhood':
        data = await saveNeighborhood(OPENID, event)
        break
      case 'deleteFiles':
        data = await deleteFiles(OPENID, event)
        break
      default:
        throw makeError('UNKNOWN_ACTION', '不支持的操作')
    }
    return { ok: true, ...data }
  } catch (error) {
    console.error('[houseService]', event.action, error)
    return {
      ok: false,
      code: error.code || 'SERVER_ERROR',
      message: error.message || '服务请求失败'
    }
  }
}
