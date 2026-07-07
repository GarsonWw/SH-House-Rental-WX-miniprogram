Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    noop() {},

    onDismiss() {
      this.triggerEvent('dismiss')
    }
  }
})
