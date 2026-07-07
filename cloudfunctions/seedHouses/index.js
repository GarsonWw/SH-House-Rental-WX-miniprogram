const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const TEST_BATCH = 'luohu-10-houses-3-neighborhoods-v1'
const BOOTSTRAP_ADMIN_OPENIDS = [
  'oA0h43eQhrZqdISgjJctd-hswB_A',
  'oA0h43Qs4oEFUers_O1EB5aTGLnc'
]

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
    return getAdminOpenids().includes(openid)
  }
}

const IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=82',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=82',
  'https://images.unsplash.com/photo-1560185008-b033106af5c3?w=1200&q=82',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=82',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=82',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=82'
]

const NEIGHBORHOODS = [
  {
    name: '罗湖口岸测试公寓',
    district: '罗湖口岸',
    neighborhoodSlogan: '口岸通勤 · 步行生活圈 · 直租免中介',
    neighborhoodNote: '口岸通勤测试小区，共4套测试房源。',
    neighborhoodReview: '适合重视深港通勤效率的租客，周边商业成熟，晚归和日常采购比较方便。',
    commuteInfo: '步行约12分钟到罗湖口岸，地铁与跨境通勤方便。',
    commuteMode: '步行 / 地铁',
    safetyInfo: '公寓大堂门禁，公共区域有监控。',
    propertyType: '整栋公寓',
    parkingInfo: '有地面临停区，固定车位较少，建议提前确认。',
    deliveryInfo: '外卖和快递可送至大堂取件区。',
    shortRentInfo: '部分房源支持3个月起租。',
    roomInsight: '房源以单间和一房为主，适合个人居住和口岸通勤。',
    priceReference: '单间2980-3280元/月，一房4200元/月，两房5200元/月。',
    waterElectricFee: '多为公寓计费，水电以实际账单为准，建议看房时确认民水民电或商水商电。',
    broadbandFee: '部分房源已含基础宽带，具体以房源实际配置为准。',
    parkingFee: '车位紧张，停车费建议咨询管家确认固定车位和临停标准。',
    surroundings: '步行范围内有商场、便利店、餐饮和口岸交通。',
    suitableCrowd: '香港学生 / 深港通勤 / 罗湖上班族',
    scoutTitle: '罗湖口岸通勤测试说明',
    scoutSummary: '重点测试口岸距离、房源状态、短租标签和公寓类型展示。',
    scoutAdvice: '实际租房时请再次确认通勤时间、噪音、水电费和租期。',
    neighborhoodCover: IMAGES[0]
  },
  {
    name: '翠竹测试家园',
    district: '翠竹',
    neighborhoodSlogan: '成熟社区 · 生活便利 · 户型实用',
    neighborhoodNote: '住宅小区测试数据，共3套测试房源。',
    neighborhoodReview: '社区生活氛围成熟，适合更看重居住稳定性和日常配套的租客。',
    commuteInfo: '步行约8分钟到翠竹地铁站。',
    commuteMode: '步行 / 地铁',
    safetyInfo: '住宅门禁和物业值守，夜间出入相对稳定。',
    propertyType: '住宅小区房',
    parkingInfo: '有地下停车场，固定车位和临停按物业标准执行。',
    deliveryInfo: '外卖可送至楼下，快递集中存放。',
    shortRentInfo: '以一年租期为主。',
    roomInsight: '一房和两房户型齐全，适合个人、情侣和小家庭。',
    priceReference: '一房3600元/月，两房5600-6200元/月。',
    waterElectricFee: '以物业账单为准，通常按住宅标准结算。',
    broadbandFee: '宽带多需租客自行办理，也可咨询管家确认现有套餐。',
    parkingFee: '固定车位和临停按小区物业标准执行。',
    surroundings: '周边菜市场、医院、学校和餐饮配套较完整。',
    suitableCrowd: '罗湖上班族 / 长租 / 注重生活便利',
    scoutTitle: '翠竹成熟社区测试说明',
    scoutSummary: '重点测试住宅属性、两房筛选、已租状态和小区详情展示。',
    scoutAdvice: '看房时建议确认具体楼栋、采光、电梯和物业管理。',
    neighborhoodCover: IMAGES[2]
  },
  {
    name: '黄贝岭测试社区',
    district: '黄贝岭',
    neighborhoodSlogan: '地铁换乘 · 预算友好 · 深港生活便利',
    neighborhoodNote: '黄贝岭片区测试数据，共3套测试房源。',
    neighborhoodReview: '交通选择较多，预算跨度灵活，适合学生、合租和刚到深圳工作的租客。',
    commuteInfo: '步行约6分钟到黄贝岭地铁站。',
    commuteMode: '步行 / 地铁',
    safetyInfo: '社区出入口有门禁，建议看房时确认具体楼栋管理。',
    propertyType: '新小区房',
    parkingInfo: '小区有停车场，车位情况需按具体楼栋和物业余量确认。',
    deliveryInfo: '外卖快递可送至小区入口。',
    shortRentInfo: '其中1套支持短租。',
    roomInsight: '覆盖合租、一房和两房，可测试不同预算和租住方式。',
    priceReference: '合租2200元/月，一房3900元/月，两房5800元/月。',
    waterElectricFee: '合租需确认水电分摊方式，整租以实际账单为准。',
    broadbandFee: '网费是否包含在租金内需按具体房源确认。',
    parkingFee: '如需停车，建议确认小区固定车位月租和周边临停价格。',
    surroundings: '地铁、餐饮、超市和生活服务较集中。',
    suitableCrowd: '香港学生 / 合租 / 预算明确 / 地铁通勤',
    scoutTitle: '黄贝岭预算租房测试说明',
    scoutSummary: '重点测试合租、预算筛选、建筑属性和地图坐标。',
    scoutAdvice: '合租前建议确认室友情况、公共区域使用和水电分摊。',
    neighborhoodCover: IMAGES[4]
  }
]

const HOUSE_DEFINITIONS = [
  ['罗湖口岸测试公寓', '口岸步行通勤精装单间', 2980, '单间', 28, '整栋公寓', true, 22.5329, 114.1132, ['近口岸', '拎包入住', '免中介']],
  ['罗湖口岸测试公寓', '高层采光一室一厅', 4200, '1室1厅1卫', 45, '酒店公寓', true, 22.5334, 114.1126, ['高层采光', '家电齐全', '近地铁']],
  ['罗湖口岸测试公寓', '可短租独立卫浴单间', 3280, '单间', 30, '商业公寓', true, 22.5325, 114.1140, ['可短租', '独立卫生间', '近口岸']],
  ['罗湖口岸测试公寓', '口岸家庭整租两房', 5200, '2室1厅1卫', 68, '住宅小区房', false, 22.5340, 114.1118, ['整租', '南向', '已租测试']],
  ['翠竹测试家园', '翠竹安静南向一房', 3600, '1室1厅1卫', 42, '住宅小区房', true, 22.5579, 114.1292, ['南向', '安静', '近地铁']],
  ['翠竹测试家园', '成熟社区实用两房', 5600, '2室1厅1卫', 72, '住宅小区房', true, 22.5584, 114.1286, ['生活便利', '家电齐全', '整租']],
  ['翠竹测试家园', '电梯高层两房两厅', 6200, '2室2厅1卫', 82, '新小区房', false, 22.5575, 114.1300, ['电梯房', '高层', '已租测试']],
  ['黄贝岭测试社区', '地铁旁合租主卧', 2200, '合租/主卧', 22, '住宅小区房', true, 22.5527, 114.1358, ['合租友好', '近地铁', '独立卫生间']],
  ['黄贝岭测试社区', '预算友好一室一厅', 3900, '1室1厅1卫', 46, '商业公寓', true, 22.5531, 114.1365, ['预算友好', '拎包入住', '免中介']],
  ['黄贝岭测试社区', '地铁换乘精装两房', 5800, '2室1厅1卫', 76, '新小区房', true, 22.5522, 114.1370, ['精装修', '近地铁', '家电齐全']]
]

const NEIGHBORHOOD_AREAS = {
  '罗湖口岸测试公寓': '罗湖口岸',
  '翠竹测试家园': '翠竹',
  '黄贝岭测试社区': '黄贝岭'
}

const HOUSES = HOUSE_DEFINITIONS.map((item, index) => {
  const [neighborhood, title, price, roomType, area, buildingAttribute, available, latitude, longitude, tags] = item
  return {
    title,
    neighborhood,
    district: NEIGHBORHOOD_AREAS[neighborhood] || '其他片区',
    address: `${neighborhood}${index + 1}号测试房`,
    locationName: neighborhood,
    latitude,
    longitude,
    price,
    priceUnit: '元/月',
    roomType,
    rentType: roomType.includes('合租') ? '合租' : '整租',
    buildingAttribute,
    area,
    floor: `${index + 3}/${index % 2 ? 28 : 18}层`,
    orientation: index % 3 === 0 ? '南' : index % 3 === 1 ? '东南' : '南北',
    decoration: '精装修',
    tags,
    description: `${title}，这是用于验证多用户房源展示、筛选、地图、收藏和已租状态同步的测试数据。`,
    detailGuideTitle: '测试房源看房提示',
    detailGuideSummary: '请重点验证页面信息、联系方式和状态同步是否正常。',
    detailGuideContent: '该记录为系统测试数据，不代表真实可租房源。',
    detailGuideTip: '完成测试后可在数据库按 testBatch 字段批量删除。',
    landlordName: '孙先生',
    landlordPhone: '13520174107',
    landlordWechat: 'weixin123',
    images: [IMAGES[index % IMAGES.length], IMAGES[(index + 1) % IMAGES.length]],
    videos: [],
    available,
    viewCount: 10 + index * 7,
    version: 1,
    isTestData: true,
    testBatch: TEST_BATCH
  }
})

const neighborhoodId = name => crypto.createHash('sha1').update(name).digest('hex')

const removeExistingTestData = async () => {
  const [houseResult, neighborhoodResult] = await Promise.all([
    db.collection('houses').where({ testBatch: TEST_BATCH }).limit(100).get(),
    db.collection('neighborhoods').where({ testBatch: TEST_BATCH }).limit(100).get()
  ])
  await Promise.all([
    ...houseResult.data.map(item => db.collection('houses').doc(item._id).remove()),
    ...neighborhoodResult.data.map(item => db.collection('neighborhoods').doc(item._id).remove())
  ])
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!await isAdmin(OPENID)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: '仅管理员可以初始化测试房源'
    }
  }
  await removeExistingTestData()

  const neighborhoodResults = await Promise.allSettled(
    NEIGHBORHOODS.map(profile => db.collection('neighborhoods').doc(neighborhoodId(profile.name)).set({
      data: {
        ...profile,
        version: 1,
        isTestData: true,
        testBatch: TEST_BATCH,
        updatedAt: db.serverDate()
      }
    }))
  )

  const houseResults = await Promise.allSettled(
    HOUSES.map(house => db.collection('houses').add({
      data: {
        ...house,
        createTime: db.serverDate(),
        updatedAt: db.serverDate()
      }
    }))
  )

  const housesCreated = houseResults.filter(result => result.status === 'fulfilled').length
  const neighborhoodsCreated = neighborhoodResults.filter(result => result.status === 'fulfilled').length

  return {
    ok: housesCreated === 10 && neighborhoodsCreated === 3,
    testBatch: TEST_BATCH,
    housesCreated,
    neighborhoodsCreated,
    distribution: {
      '罗湖口岸测试公寓': 4,
      '翠竹测试家园': 3,
      '黄贝岭测试社区': 3
    }
  }
}
