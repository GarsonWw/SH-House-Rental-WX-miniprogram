// cloudfunctions/seedHouses/index.js
// 用途：一次性初始化示例房源到云数据库
// 使用方法：在微信开发者工具中右键此文件夹 → 上传并部署，然后在云函数调用面板点击调用

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const IMG = {
  livingRoom1: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  livingRoom2: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
  livingRoom3: 'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=800&q=80',
  bedroom1:    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
  bedroom2:    'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&q=80',
  bedroom3:    'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800&q=80',
  kitchen1:    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  kitchen2:    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
  bathroom1:   'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',
  luxury1:     'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  luxury2:     'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
  luxury3:     'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80',
  cozy1:       'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
  cozy2:       'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
  study1:      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
}

const HOUSES = [
  {
    title: '罗湖口岸通勤两室一厅 近大剧院商圈',
    neighborhood: '京基东方都会', district: '罗湖区',
    address: '京基东方都会3栋1单元', price: 5200, priceUnit: '元/月',
    roomType: '2室1厅1卫', area: 85, floor: '8/18层',
    orientation: '南北', decoration: '精装修',
    tags: ['近地铁', '拎包入住', '罗湖核心'],
    description: '房子位于京基东方都会，南北通透，采光好，精装修，家具家电齐全，拎包入住。靠近大剧院、红岭南等地铁站，去福田和罗湖口岸都方便。',
    landlordName: '王先生', landlordPhone: '13812345678', landlordWechat: 'wangxiansheng2024',
    images: [IMG.livingRoom1, IMG.bedroom1, IMG.kitchen1, IMG.bathroom1],
    available: true, viewCount: 128, createTime: new Date('2024-01-15')
  },
  {
    title: '黄贝岭温馨一室一厅 地铁换乘方便',
    neighborhood: '深业东岭', district: '罗湖区',
    address: '深业东岭B区15栋', price: 3600, priceUnit: '元/月',
    roomType: '1室1厅1卫', area: 52, floor: '12/26层',
    orientation: '南', decoration: '精装修',
    tags: ['近商场', '地铁口', '安静'],
    description: '一室一厅，精装修，家具齐全，靠近黄贝岭地铁站，周边餐饮、超市和生活服务完善，非常适合罗湖上班族。',
    landlordName: '李女士', landlordPhone: '13987654321', landlordWechat: 'linv_2088',
    images: [IMG.cozy1, IMG.bedroom2, IMG.kitchen2],
    available: true, viewCount: 87, createTime: new Date('2024-01-18')
  },
  {
    title: '银湖山景三房带书房 品质安静社区',
    neighborhood: '华润银湖蓝山', district: '罗湖区',
    address: '华润银湖蓝山6期18栋', price: 9800, priceUnit: '元/月',
    roomType: '3室2厅2卫', area: 128, floor: '15/32层',
    orientation: '东南', decoration: '豪装',
    tags: ['豪华装修', '山景房', '高楼层'],
    description: '三室两厅豪华装修，可看银湖山景，高楼层视野开阔，品质小区安保严格，适合希望住得安静、舒适的家庭。',
    landlordName: '陈先生', landlordPhone: '13611112222', landlordWechat: 'chen_luxuryrent',
    images: [IMG.luxury1, IMG.luxury2, IMG.luxury3, IMG.study1],
    available: true, viewCount: 203, createTime: new Date('2024-01-20')
  },
  {
    title: '蔡屋围合租大卧室 独立卫生间',
    neighborhood: '京基东方都会', district: '罗湖区',
    address: '京基东方都会5栋302室', price: 2600, priceUnit: '元/月',
    roomType: '合租/主卧', area: 25, floor: '3/18层',
    orientation: '南', decoration: '简装',
    tags: ['独立卫生间', '近地铁', '合租友好'],
    description: '整套房子4室合租，主卧带独立卫生间，空间宽敞，室友都是上班族。靠近罗湖核心商圈，通勤和日常生活都方便。',
    landlordName: '张小姐', landlordPhone: '13733334444', landlordWechat: 'zhang_hezhu',
    images: [IMG.bedroom3, IMG.bathroom1, IMG.livingRoom3],
    available: true, viewCount: 156, createTime: new Date('2024-01-22')
  },
  {
    title: '黄贝岭整租两室 家电齐全 可短租',
    neighborhood: '深业东岭', district: '罗湖区',
    address: '深业东岭A区8栋1201', price: 5600, priceUnit: '元/月',
    roomType: '2室1厅1卫', area: 78, floor: '12/28层',
    orientation: '西南', decoration: '精装修',
    tags: ['可短租', '家电齐全', '随时可看'],
    description: '两室一厅精装修，冰箱、洗衣机、热水器、空调全套，支持3个月短租，随时可以预约看房，房东本人直租无中介费。',
    landlordName: '刘先生', landlordPhone: '13855556666', landlordWechat: 'liu_zhuzhu',
    images: [IMG.livingRoom2, IMG.bedroom1, IMG.kitchen2, IMG.bathroom1],
    available: true, viewCount: 94, createTime: new Date('2024-01-25')
  },
  {
    title: '翠竹生活圈三室两厅 紧邻学校医院',
    neighborhood: '合正锦湖逸园', district: '罗湖区',
    address: '合正锦湖逸园A栋', price: 8200, priceUnit: '元/月',
    roomType: '3室2厅1卫', area: 110, floor: '6/12层',
    orientation: '南', decoration: '精装修',
    tags: ['生活便利', '学校旁', '中低楼层'],
    description: '翠竹成熟生活圈三室两厅，精装修，家具齐全，小区绿化好安保严。周边学校、医院、菜市场和商业配套步行可达。',
    landlordName: '吴女士', landlordPhone: '13977778888', landlordWechat: 'wu_xuequ_fang',
    images: [IMG.cozy2, IMG.bedroom2, IMG.study1, IMG.kitchen1],
    available: true, viewCount: 312, createTime: new Date('2024-01-28')
  }
]

exports.main = async () => {
  // 检查是否已有数据，避免重复导入
  const { total } = await db.collection('houses').count()
  if (total > 0) {
    return { code: 1, message: `数据库中已有 ${total} 条房源，跳过初始化。如需重置请先手动清空 houses 集合。` }
  }

  // 批量写入
  const results = await Promise.allSettled(
    HOUSES.map(h => db.collection('houses').add({ data: h }))
  )

  const success = results.filter(r => r.status === 'fulfilled').length
  const fail    = results.filter(r => r.status === 'rejected').length

  return { code: 0, message: `初始化完成：成功 ${success} 条，失败 ${fail} 条。` }
}
