// cloudfunctions/login/index.js
// 用途：安全获取用户 openid（openid 不能在前端直接获取，必须通过云函数）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext()
  return { openid: OPENID, appid: APPID, unionid: UNIONID }
}
