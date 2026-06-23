// utils/util.js - 工具函数

/**
 * 格式化时间
 */
const formatTime = date => {
  if (!date) return ''
  date = normalizeDate(date)
  if (!date || isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const normalizeDate = value => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number' || typeof value === 'string') return new Date(value)
  if (value.$date) return new Date(value.$date)
  if (value._date) return new Date(value._date)
  if (value.seconds) return new Date(value.seconds * 1000)
  if (value._seconds) return new Date(value._seconds * 1000)
  if (typeof value.toDate === 'function') return value.toDate()
  return null
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 拨打电话
 */
const makePhoneCall = (phone) => {
  wx.makePhoneCall({
    phoneNumber: phone,
    fail: () => {
      wx.showToast({
        title: '拨号失败',
        icon: 'none'
      })
    }
  })
}

/**
 * 复制到剪贴板
 */
const copyToClipboard = (text, successMsg = '已复制到剪贴板') => {
  wx.setClipboardData({
    data: text,
    success: () => {
      wx.showToast({
        title: successMsg,
        icon: 'success',
        duration: 2000
      })
    }
  })
}

/**
 * 跳转到微信联系人（通过复制微信号提示用户）
 */
const contactByWechat = (wechatId, name) => {
  wx.showModal({
    title: `联系 ${name || '房东'}`,
    content: `微信号：${wechatId}\n\n点击确认复制微信号，然后在微信中搜索添加`,
    confirmText: '复制微信号',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        copyToClipboard(wechatId, '微信号已复制')
      }
    }
  })
}

/**
 * 计算房源发布时间距今
 */
const getTimeAgo = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

/**
 * 验证手机号
 */
const validatePhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 获取朝向图标
 */
const getOrientationIcon = (orientation) => {
  const icons = {
    '南': '☀️',
    '北': '❄️',
    '东': '🌅',
    '西': '🌇',
    '南北': '↕️',
    '东南': '↗️',
    '东北': '↖️',
    '西南': '↙️',
    '西北': '↘️'
  }
  return icons[orientation] || '📐'
}

/**
 * 生成随机ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

module.exports = {
  formatTime,
  normalizeDate,
  formatNumber,
  makePhoneCall,
  copyToClipboard,
  contactByWechat,
  getTimeAgo,
  validatePhone,
  getOrientationIcon,
  generateId
}
