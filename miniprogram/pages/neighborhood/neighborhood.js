// pages/neighborhood/neighborhood.js
const app = getApp()

Page({
  data: {
    searchValue: '',
    selectedNeighborhood: null,
    neighborhoodList: [],
    filteredNeighborhoodList: [],
    houseList: [],
    showHouseList: false,
    districtList: [],
    selectedDistrict: '全部'
  },

  onLoad(options) {
    if (options.name) {
      const name = decodeURIComponent(options.name)
      app.onHouseListReady(() => {
        this.loadData()
        this.selectNeighborhood(name)
      })
    } else {
      app.onHouseListReady(() => this.loadData())
    }
  },

  onShow() {
    app.onHouseListReady(() => this.loadData())
  },

  loadData() {
    const neighborhoodList = app.globalData.neighborhoodList
    const districts = ['全部', ...new Set(neighborhoodList.map(n => n.district))]
    this.setData({
      neighborhoodList,
      filteredNeighborhoodList: neighborhoodList,
      districtList: districts
    })
  },

  onDistrictSelect(e) {
    const district = e.currentTarget.dataset.district
    this.setData({ selectedDistrict: district })
    this.filterNeighborhoods()
  },

  filterNeighborhoods() {
    const { neighborhoodList, selectedDistrict, searchValue } = this.data
    let filtered = neighborhoodList

    if (selectedDistrict !== '全部') {
      filtered = filtered.filter(n => n.district === selectedDistrict)
    }

    if (searchValue) {
      filtered = filtered.filter(n => n.name.includes(searchValue))
    }

    this.setData({ filteredNeighborhoodList: filtered })
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value })
    this.filterNeighborhoods()
  },

  onSearch(e) {
    this.setData({ searchValue: e.detail.value })
    this.filterNeighborhoods()
  },

  onSearchClear() {
    this.setData({ searchValue: '' })
    this.filterNeighborhoods()
  },

  onNeighborhoodTap(e) {
    const { name } = e.currentTarget.dataset
    this.selectNeighborhood(name)
  },

  selectNeighborhood(name) {
    const houses = app.getHousesByNeighborhood(name)
    const neighborhood = this.data.neighborhoodList.find(n => n.name === name)

    this.setData({
      selectedNeighborhood: neighborhood || { name },
      houseList: houses,
      showHouseList: true
    })
  },

  onBack() {
    this.setData({
      showHouseList: false,
      selectedNeighborhood: null,
      houseList: []
    })
  },

  onHouseTap(e) {
    const { house } = e.detail
    this.incrementViewCount(house.id)
    wx.navigateTo({
      url: `/pages/detail/detail?id=${house.id}`
    })
  },

  incrementViewCount(id) {
    app.incrementViewCount(id)
  },

  onPublish() {
    wx.switchTab({ url: '/pages/publish/publish' })
  }
})
