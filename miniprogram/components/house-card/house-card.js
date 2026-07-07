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
      const { phone } = e.currentTarget.dataset
      if (!phone) {
        wx.showToast({ title: '暂无联系电话', icon: 'none' })
        return
      }
      wx.makePhoneCall({ phoneNumber: phone })
    }
  }
})
