Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    noop() {},

    onAddWechat() {
      wx.showToast({
        title: '请长按上方二维码识别添加',
        icon: 'none',
        duration: 2500
      })
    },

    onDismiss() {
      this.triggerEvent('dismiss')
    }
  }
})
