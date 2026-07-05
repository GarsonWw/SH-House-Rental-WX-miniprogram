const BROWSE_COUNT_KEY = 'consultBrowseCount'
const BROWSE_THRESHOLD = 5

function normalizeCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? count : 0
}

function getBrowseCount() {
  return normalizeCount(wx.getStorageSync(BROWSE_COUNT_KEY))
}

function shouldShowModal() {
  return getBrowseCount() >= BROWSE_THRESHOLD
}

function recordDetailView(callback) {
  const count = getBrowseCount() + 1
  const show = count >= BROWSE_THRESHOLD
  wx.setStorageSync(BROWSE_COUNT_KEY, show ? 0 : count)
  if (callback) callback({ counted: true, count: show ? BROWSE_THRESHOLD : count, shouldShow: show })
}

module.exports = {
  BROWSE_COUNT_KEY,
  BROWSE_THRESHOLD,
  getBrowseCount,
  shouldShowModal,
  recordDetailView
}
