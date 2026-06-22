// components/house-card/house-card.js
Component({
  properties: {
    house: {
      type: Object,
      value: {}
    },
    showContact: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { house: this.properties.house })
    },

    onPhoneCall(e) {
      e.stopPropagation()
      const { phone } = e.currentTarget.dataset
      wx.makePhoneCall({ phoneNumber: phone })
    },

    onCopyWechat(e) {
      e.stopPropagation()
      const { wechat, name } = e.currentTarget.dataset
      wx.showModal({
        title: `联系 ${name}`,
        content: `微信号：${wechat}\n\n点击确认复制微信号`,
        confirmText: '复制微信号',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: wechat,
              success: () => {
                wx.showToast({ title: '微信号已复制', icon: 'success' })
              }
            })
          }
        }
      })
    }
  }
})
