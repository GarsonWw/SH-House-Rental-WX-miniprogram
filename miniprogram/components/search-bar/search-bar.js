// components/search-bar/search-bar.js
Component({
  properties: {
    placeholder: {
      type: String,
      value: '搜索小区、地址、房型...'
    },
    value: {
      type: String,
      value: ''
    },
    focus: {
      type: Boolean,
      value: false
    }
  },

  data: {
    inputValue: ''
  },

  observers: {
    'value'(val) {
      this.setData({ inputValue: val })
    }
  },

  methods: {
    onInput(e) {
      const value = e.detail.value
      this.setData({ inputValue: value })
      this.triggerEvent('input', { value })
    },

    onSearch() {
      this.triggerEvent('search', { value: this.data.inputValue })
    },

    onClear() {
      this.setData({ inputValue: '' })
      this.triggerEvent('clear')
      this.triggerEvent('input', { value: '' })
    },

    onConfirm(e) {
      this.triggerEvent('search', { value: e.detail.value })
    }
  }
})
