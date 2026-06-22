// pages/publish/publish.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    form: {
      title: '',
      neighborhood: '',
      district: '',
      address: '',
      price: '',
      roomType: '',
      area: '',
      floor: '',
      orientation: '',
      decoration: '',
      description: '',
      landlordName: '',
      landlordPhone: '',
      landlordWechat: '',
      available: true,
      tags: [],
      images: [],
      videos: []     // 最多1个，15秒以内
    },
    roomTypeOptions: ['1室1厅1卫', '2室1厅1卫', '2室2厅1卫', '3室1厅1卫', '3室2厅1卫', '3室2厅2卫', '合租/主卧', '合租/次卧', '整套公寓'],
    orientationOptions: ['南', '北', '东', '西', '南北', '东南', '东北', '西南', '西北'],
    decorationOptions: ['毛坯', '简装', '中装', '精装修', '豪装'],
    tagOptions: ['近地铁', '拎包入住', '南北通透', '近商场', '学区房', '可短租', '停车方便', '独立卫生间', '合租友好', '宠物友好', '无中介', '家电齐全'],
    selectedTags: [],
    submitting: false,
    currentStep: 1, // 1:基本信息 2:房东信息 3:预览确认
    showRoomTypePicker: false,
    showOrientationPicker: false,
    showDecorationPicker: false
  },

  onLoad() {
    // 获取用户信息填充默认姓名
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ 'form.landlordName': userInfo.nickName })
    }
  },

  // 表单输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({ [`form.${field}`]: value })
  },

  // 选择器
  onPickerChange(e) {
    const { field, options } = e.currentTarget.dataset
    const idx = e.detail.value
    const value = this.data[options][idx]
    this.setData({ [`form.${field}`]: value })
  },

  // 标签选择
  onTagToggle(e) {
    const { tag } = e.currentTarget.dataset
    const tags = [...this.data.selectedTags]
    const idx = tags.indexOf(tag)
    if (idx > -1) {
      tags.splice(idx, 1)
    } else {
      if (tags.length >= 5) {
        wx.showToast({ title: '最多选5个标签', icon: 'none' })
        return
      }
      tags.push(tag)
    }
    this.setData({
      selectedTags: tags,
      'form.tags': tags
    })
  },

  // 上传图片
  onChooseImage() {
    const current = this.data.form.images.length
    if (current >= 6) {
      wx.showToast({ title: '最多上传6张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 6 - current,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        const images = [...this.data.form.images, ...newImages]
        this.setData({ 'form.images': images })
      }
    })
  },

  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.form.images]
    images.splice(index, 1)
    this.setData({ 'form.images': images })
  },

  onChooseVideo() {
    if (this.data.form.videos.length >= 1) {
      wx.showToast({ title: '最多上传1个视频', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 15,
      camera: 'back',
      success: res => {
        const file = res.tempFiles[0]
        if (file.duration > 15) {
          wx.showToast({ title: '视频不能超过15秒', icon: 'none', duration: 2000 })
          return
        }
        this.setData({
          'form.videos': [file.tempFilePath],
          'form.videoCover': file.thumbTempFilePath || ''
        })
      }
    })
  },

  onDeleteVideo() {
    this.setData({ 'form.videos': [], 'form.videoCover': '' })
  },

  // 步骤切换
  onNextStep() {
    if (this.data.currentStep === 1 && !this.validateStep1()) return
    if (this.data.currentStep === 2 && !this.validateStep2()) return
    this.setData({ currentStep: this.data.currentStep + 1 })
  },

  onPrevStep() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 })
    }
  },

  validateStep1() {
    const { form } = this.data
    if (!form.neighborhood.trim()) {
      wx.showToast({ title: '请填写小区名称', icon: 'none' })
      return false
    }
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) {
      wx.showToast({ title: '请填写正确的租金', icon: 'none' })
      return false
    }
    if (!form.roomType) {
      wx.showToast({ title: '请选择房型', icon: 'none' })
      return false
    }
    if (!form.area || isNaN(form.area) || Number(form.area) <= 0) {
      wx.showToast({ title: '请填写正确的面积', icon: 'none' })
      return false
    }
    return true
  },

  validateStep2() {
    const { form } = this.data
    if (!form.landlordName.trim()) {
      wx.showToast({ title: '请填写您的姓名', icon: 'none' })
      return false
    }
    if (!form.landlordPhone.trim()) {
      wx.showToast({ title: '请填写联系电话', icon: 'none' })
      return false
    }
    if (!util.validatePhone(form.landlordPhone)) {
      wx.showToast({ title: '请填写正确的手机号', icon: 'none' })
      return false
    }
    if (!form.landlordWechat.trim()) {
      wx.showToast({ title: '请填写微信号', icon: 'none' })
      return false
    }
    return true
  },

  // 提交发布
  onSubmit() {
    if (!this.validateStep1() || !this.validateStep2()) return

    this.setData({ submitting: true })

    const form = { ...this.data.form }
    if (!form.title.trim()) {
      form.title = `${form.neighborhood} ${form.roomType} ${form.decoration || ''} 出租`.trim()
    }

    wx.showLoading({ title: '上传图片中...' })

    // 先上传图片+视频到云存储，再发布房源
    const isCloud = p => p && (p.startsWith('cloud://') || p.startsWith('http'))
    const tempImages = form.images.filter(p => !isCloud(p))
    const cloudImages = form.images.filter(isCloud)
    const tempVideos  = (form.videos || []).filter(p => !isCloud(p))
    const cloudVideos = (form.videos || []).filter(isCloud)

    app.uploadImages(tempImages, (imgIDs, imgErr) => {
      if (imgErr) {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showToast({ title: '图片上传失败，请重试', icon: 'none', duration: 2500 })
        return
      }

      wx.showLoading({ title: '上传视频中...' })

      app.uploadImages(tempVideos, (vidIDs, vidErr) => {
        if (vidErr) {
          wx.hideLoading()
          this.setData({ submitting: false })
          wx.showToast({ title: '视频上传失败，请重试', icon: 'none', duration: 2500 })
          return
        }

        wx.showLoading({ title: '发布中...' })

        const houseData = {
          ...form,
          images: [...cloudImages, ...imgIDs],
          videos: [...cloudVideos, ...vidIDs],
          price: Number(form.price),
          area: Number(form.area)
        }

        app.addHouse(houseData, (newHouse, err) => {
          wx.hideLoading()
          this.setData({ submitting: false })

          if (err) {
            wx.showToast({ title: '发布失败，请检查网络', icon: 'none', duration: 2500 })
            return
          }

          wx.showModal({
            title: '🎉 发布成功！',
            content: '您的房源已发布到云端，所有用户均可搜索到您的房源并联系您。',
            confirmText: '查看房源',
            cancelText: '再发一套',
            success: res => {
              if (res.confirm && newHouse) {
                wx.navigateTo({ url: `/pages/detail/detail?id=${newHouse.id}` })
              }
              this.resetForm()
            }
          })
        })
      })
    })
  },

  resetForm() {
    this.setData({
      form: {
        title: '',
        neighborhood: '',
        district: '',
        address: '',
        price: '',
        roomType: '',
        area: '',
        floor: '',
        orientation: '',
        decoration: '',
        description: '',
        landlordName: '',
        landlordPhone: '',
        landlordWechat: '',
        available: true,
        tags: [],
        images: [],
        videos: [],
        videoCover: ''
      },
      selectedTags: [],
      currentStep: 1
    })
  }
})
