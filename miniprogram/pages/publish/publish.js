// pages/publish/publish.js
const app = getApp()
const util = require('../../utils/util')

const TAG_OPTIONS = ['近地铁', '拎包入住', '南北通透', '近商场', '学区房', '可短租', '停车方便', '独立卫生间', '合租友好', '宠物友好', '无中介', '家电齐全']
const DISTRICT_OPTIONS = ['罗湖口岸', '国贸', '东门', '黄贝岭', '翠竹', '笋岗', '银湖', '蔡屋围', '莲塘', '水贝', '布心', '清水河', '其他片区']

const buildTagOptions = selectedTags => {
  const selected = Array.isArray(selectedTags) ? selectedTags : []
  return TAG_OPTIONS.map(label => ({
    label,
    selected: selected.indexOf(label) > -1
  }))
}

Page({
  data: {
    form: {
      title: '',
      neighborhood: '',
      neighborhoodNote: '',
      neighborhoodReview: '',
      neighborhoodCover: '',
      neighborhoodSlogan: '',
      commuteInfo: '',
      commuteMode: '步行',
      safetyInfo: '',
      propertyType: '',
      deliveryInfo: '',
      shortRentInfo: '',
      roomInsight: '',
      priceReference: '',
      surroundings: '',
      suitableCrowd: '',
      scoutTitle: '',
      scoutSummary: '',
      scoutAdvice: '',
      district: '',
      address: '',
      locationName: '',
      latitude: '',
      longitude: '',
      price: '',
      roomType: '',
      buildingAttribute: '',
      area: '',
      floor: '',
      orientation: '',
      decoration: '',
      description: '',
      detailGuideTitle: '',
      detailGuideSummary: '',
      detailGuideContent: '',
      detailGuideTip: '',
      landlordName: '',
      landlordPhone: '',
      landlordWechat: '',
      available: true,
      tags: [],
      images: [],
      videos: []     // 最多1个，60秒以内
    },
    roomTypeOptions: ['1室1厅1卫', '2室1厅1卫', '2室2厅1卫', '3室1厅1卫', '3室2厅1卫', '3室2厅2卫', '合租/主卧', '合租/次卧', '整套公寓'],
    districtOptions: DISTRICT_OPTIONS,
    buildingAttributeOptions: ['住宅小区房', '新小区房', '商业公寓', '整栋公寓', '酒店公寓'],
    orientationOptions: ['南', '北', '东', '西', '南北', '东南', '东北', '西南', '西北'],
    decorationOptions: ['毛坯', '简装', '中装', '精装修', '豪装'],
    tagOptions: buildTagOptions([]),
    selectedTags: [],
    submitting: false,
    isEditMode: false,
    editHouseId: '',
    showAdvancedHouseFields: false,
    currentStep: 1, // 1:基本信息 2:房东信息 3:预览确认
    showRoomTypePicker: false,
    showOrientationPicker: false,
    showDecorationPicker: false
  },

  onLoad(options = {}) {
    app.requireLandlord((isLandlord, error) => {
      if (!isLandlord) {
        wx.showModal({
          title: '无权发布房源',
          content: error ? error.message : '当前微信账号不在管理员名单中',
          showCancel: false,
          success: () => wx.navigateBack()
        })
        return
      }
      this.initializePage(options)
    })
  },

  initializePage(options = {}) {
    if (options.id) {
      this.loadEditHouse(options.id)
      return
    }

    // 获取用户信息填充默认姓名
    const userProfile = app.globalData.userProfile
    if (userProfile) {
      this.setData({ 'form.landlordName': userProfile.nickName })
    }
  },

  loadEditHouse(id) {
    wx.setNavigationBarTitle({ title: '编辑房源' })
    const setEditForm = (house) => {
      const tags = Array.isArray(house.tags) ? [...house.tags] : []
      this.setData({
        isEditMode: true,
        editHouseId: id,
        selectedTags: tags,
        tagOptions: buildTagOptions(tags),
        form: {
          title: house.title || '',
          neighborhood: house.neighborhood || '',
          neighborhoodNote: house.neighborhoodNote || house.neighborhoodDesc || '',
          neighborhoodReview: house.neighborhoodReview || '',
          neighborhoodCover: house.neighborhoodCover || '',
          neighborhoodSlogan: house.neighborhoodSlogan || '',
          commuteInfo: house.commuteInfo || '',
          commuteMode: house.commuteMode || '步行',
          safetyInfo: house.safetyInfo || '',
          propertyType: house.propertyType || '',
          deliveryInfo: house.deliveryInfo || '',
          shortRentInfo: house.shortRentInfo || '',
          roomInsight: house.roomInsight || '',
          priceReference: house.priceReference || '',
          surroundings: house.surroundings || '',
          suitableCrowd: house.suitableCrowd || '',
          scoutTitle: house.scoutTitle || '',
          scoutSummary: house.scoutSummary || '',
          scoutAdvice: house.scoutAdvice || '',
          district: house.district || '',
          address: house.address || '',
          locationName: house.locationName || '',
          latitude: house.latitude || '',
          longitude: house.longitude || '',
          price: String(house.price || ''),
          roomType: house.roomType || '',
          buildingAttribute: house.buildingAttribute || house.propertyType || '',
          area: String(house.area || ''),
          floor: house.floor || '',
          orientation: house.orientation || '',
          decoration: house.decoration || '',
          description: house.description || '',
          detailGuideTitle: house.detailGuideTitle || '',
          detailGuideSummary: house.detailGuideSummary || '',
          detailGuideContent: house.detailGuideContent || '',
          detailGuideTip: house.detailGuideTip || '',
          landlordName: house.landlordName || '',
          landlordPhone: house.landlordPhone || '',
          landlordWechat: house.landlordWechat || '',
          available: house.available !== false,
          tags,
          images: Array.isArray(house.images) ? [...house.images] : [],
          videos: Array.isArray(house.videos) ? [...house.videos] : [],
          videoCover: house.videoCover || ''
        }
      })
    }

    wx.showLoading({ title: '加载房源...' })
    app.getHouseFresh(id, (house, error) => {
      if (!error && house) {
        wx.hideLoading()
        setEditForm(house)
        return
      }
      wx.hideLoading()
      this.showCloudError('加载失败', error, '无法获取房源详情，请稍后重试。')
      setTimeout(() => wx.navigateBack(), 1200)
    })
  },

  // 表单输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset
    const value = Object.prototype.hasOwnProperty.call(e.currentTarget.dataset, 'value')
      ? e.currentTarget.dataset.value === 'true'
        ? true
        : e.currentTarget.dataset.value === 'false'
          ? false
          : e.currentTarget.dataset.value
      : e.detail.value
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
    if (!tag) return
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
      tagOptions: buildTagOptions(tags),
      'form.tags': tags
    })
  },

  onToggleAdvancedHouseFields() {
    this.setData({ showAdvancedHouseFields: !this.data.showAdvancedHouseFields })
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
      },
      fail: err => {
        console.error('[Publish] 选择图片失败', err)
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  onChooseLocation() {
    const form = this.data.form
    const latitude = Number(form.latitude) || 22.5550
    const longitude = Number(form.longitude) || 114.1200

    wx.chooseLocation({
      latitude,
      longitude,
      success: res => {
        const nextData = {
          'form.locationName': res.name || '',
          'form.latitude': res.latitude,
          'form.longitude': res.longitude
        }

        if (!form.neighborhood.trim() && res.name) {
          nextData['form.neighborhood'] = res.name
        }
        if (!form.address.trim() && res.address) {
          nextData['form.address'] = res.address
        }

        this.setData(nextData)
        wx.showToast({ title: '位置已选择', icon: 'success' })
      },
      fail: err => {
        if (err && err.errMsg && err.errMsg.includes('cancel')) return
        wx.showToast({ title: '选择位置失败', icon: 'none' })
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
      maxDuration: 60,
      camera: 'back',
      success: res => {
        const file = res.tempFiles[0]
        if (file.duration > 60) {
          wx.showToast({ title: '视频不能超过60秒', icon: 'none', duration: 2000 })
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

  onPrefillLandlordInfo() {
    this.setData({
      'form.landlordName': '孙先生',
      'form.landlordPhone': '13520174107',
      'form.landlordWechat': 'weixin123'
    })
    wx.showToast({ title: '已填充房东信息', icon: 'success' })
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
    if (!DISTRICT_OPTIONS.includes(form.district)) {
      wx.showToast({ title: '请选择罗湖片区', icon: 'none' })
      return false
    }
    if (!form.latitude || !form.longitude) {
      wx.showToast({ title: '请在地图中选择小区位置', icon: 'none' })
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
    if (!app.globalData.isLandlord) {
      wx.showToast({ title: '无房东管理权限', icon: 'none' })
      return
    }
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
        this.showCloudError('图片上传失败', imgErr, '请确认云开发环境、云存储权限已开启。')
        return
      }

      wx.showLoading({ title: '上传视频中...' })

      app.uploadImages(tempVideos, (vidIDs, vidErr) => {
        if (vidErr) {
          wx.hideLoading()
          this.setData({ submitting: false })
          app.deleteUploadedFiles(imgIDs, () => {
            this.showCloudError('视频上传失败', vidErr, '请确认云开发环境、云存储权限已开启。')
          })
          return
        }

        wx.showLoading({ title: this.data.isEditMode ? '保存中...' : '发布中...' })

        const houseData = {
          ...form,
          images: [...cloudImages, ...imgIDs],
          videos: [...cloudVideos, ...vidIDs],
          videoCover: isCloud(form.videoCover) ? form.videoCover : '',
          price: Number(form.price),
          area: Number(form.area),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude)
        }

        if (this.data.isEditMode) {
          app.updateHouse(this.data.editHouseId, houseData, err => {
            wx.hideLoading()
            this.setData({ submitting: false })

            if (err) {
              this.showCloudError('保存失败', err, '请确认 houses 数据库集合允许当前用户写入。')
              return
            }

            wx.showModal({
              title: '保存成功',
              content: '房源信息已更新。',
              confirmText: '查看房源',
              cancelText: '返回管理',
              success: res => {
                if (res.confirm) {
                  wx.redirectTo({ url: `/pages/detail/detail?id=${this.data.editHouseId}` })
                } else {
                  wx.navigateBack()
                }
              }
            })
          })
          return
        }

        app.addHouse(houseData, (newHouse, err) => {
          wx.hideLoading()
          this.setData({ submitting: false })

          if (err) {
            this.showCloudError('发布失败', err, '请确认 houses 数据库集合已创建，并允许当前用户写入。')
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
      }, 'house-videos')
    })
  },

  showCloudError(title, err, hint) {
    const detail = app.getCloudErrorMessage
      ? app.getCloudErrorMessage(err, title)
      : (err && (err.errMsg || err.message)) || title
    wx.showModal({
      title,
      content: `${hint}\n\n错误详情：${detail}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  resetForm() {
    this.setData({
      form: {
        title: '',
        neighborhood: '',
        neighborhoodNote: '',
        neighborhoodReview: '',
        neighborhoodCover: '',
        neighborhoodSlogan: '',
        commuteInfo: '',
        commuteMode: '步行',
        safetyInfo: '',
        propertyType: '',
        deliveryInfo: '',
        shortRentInfo: '',
        roomInsight: '',
        priceReference: '',
        surroundings: '',
        suitableCrowd: '',
        scoutTitle: '',
        scoutSummary: '',
        scoutAdvice: '',
        district: '',
        address: '',
        locationName: '',
        latitude: '',
        longitude: '',
        price: '',
        roomType: '',
        buildingAttribute: '',
        area: '',
        floor: '',
        orientation: '',
        decoration: '',
        description: '',
        detailGuideTitle: '',
        detailGuideSummary: '',
        detailGuideContent: '',
        detailGuideTip: '',
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
      tagOptions: buildTagOptions([]),
      showAdvancedHouseFields: false,
      currentStep: 1
    })
  }
})
