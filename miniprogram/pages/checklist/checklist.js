// pages/checklist/checklist.js

const HKUST_CHECKLIST = [
  { id: 'u1',  category: '证件材料', text: '录取通知书（Offer Letter）' },
  { id: 'u2',  category: '证件材料', text: '护照（有效期6个月以上）' },
  { id: 'u3',  category: '证件材料', text: '港澳通行证（内地学生必备）' },
  { id: 'u4',  category: '证件材料', text: '学生签证 / 入境许可（IANG）' },
  { id: 'u5',  category: '学历文件', text: '高考成绩单（官方认证版）' },
  { id: 'u6',  category: '学历文件', text: '本科学位证 / 毕业证（研究生）' },
  { id: 'u7',  category: '学历文件', text: '英语成绩单（IELTS / TOEFL）' },
  { id: 'u8',  category: '健康材料', text: '健康申报表（Health Declaration）' },
  { id: 'u9',  category: '健康材料', text: '疫苗接种证明（含新冠、肝炎等）' },
  { id: 'u10', category: '住宿安排', text: '宿舍申请确认函 / 校外租房合同' },
  { id: 'u11', category: '住宿安排', text: '紧急联系人信息表' },
  { id: 'u12', category: '财务准备', text: '学费首期缴款凭证' },
  { id: 'u13', category: '财务准备', text: '香港本地银行开户（汇丰/渣打/中银）' },
  { id: 'u14', category: '日常必备', text: '香港本地电话号码（SIM卡）' },
  { id: 'u15', category: '日常必备', text: '八达通交通卡' },
  { id: 'u16', category: '日常必备', text: '学生证（Orientation 时领取）' },
  { id: 'u17', category: '日常必备', text: '笔记本电脑 / 平板电脑' },
  { id: 'u18', category: '注册流程', text: '完成网上选课（Course Registration）' },
  { id: 'u19', category: '注册流程', text: '参加 Orientation Week 活动' },
  { id: 'u20', category: '注册流程', text: '激活 ITSC 账号 / 校园邮箱' },
]

const HKU_CHECKLIST = [
  { id: 'h1',  category: '证件材料', text: '录取通知书（Offer / Admission Letter）' },
  { id: 'h2',  category: '证件材料', text: '护照（有效期6个月以上）' },
  { id: 'h3',  category: '证件材料', text: '港澳通行证（内地学生必备）' },
  { id: 'h4',  category: '证件材料', text: '学生签证 / IANG 签注' },
  { id: 'h5',  category: '学历文件', text: '高考成绩证明（HKDSE / 高考）' },
  { id: 'h6',  category: '学历文件', text: '本科毕业证 / 学位证（研究生）' },
  { id: 'h7',  category: '学历文件', text: '英语成绩单（IELTS 6.5+ / TOEFL）' },
  { id: 'h8',  category: '学历文件', text: '成绩单（官方密封版）' },
  { id: 'h9',  category: '健康材料', text: '学生健康申报表（Student Health Form）' },
  { id: 'h10', category: '健康材料', text: '疫苗接种记录（TB / 肝炎 / MMR）' },
  { id: 'h11', category: '住宿安排', text: '宿舍录取信 / 校外住房合同' },
  { id: 'h12', category: '住宿安排', text: '紧急联系人表格（Emergency Contact）' },
  { id: 'h13', category: '财务准备', text: '学费缴纳收据（HKU Portal）' },
  { id: 'h14', category: '财务准备', text: '香港本地账户（中银 / 汇丰 / 恒生）' },
  { id: 'h15', category: '日常必备', text: '本地香港电话号码（SIM 卡）' },
  { id: 'h16', category: '日常必备', text: '八达通卡（Octopus Card）' },
  { id: 'h17', category: '日常必备', text: '学生证（Enrolment Day 领取）' },
  { id: 'h18', category: '日常必备', text: '笔记本电脑（建议 Mac / Windows）' },
  { id: 'h19', category: '注册流程', text: '完成 HKU Portal 网上注册' },
  { id: 'h20', category: '注册流程', text: '参加 Orientation Camp / 迎新活动' },
  { id: 'h21', category: '注册流程', text: '激活 HKU Connect 邮箱' },
  { id: 'h22', category: '注册流程', text: '加入院系微信群 / WhatsApp 群' },
]

Page({
  data: {
    activeUni: '',
    universities: [
      {
        key: 'hkust',
        name: '香港科技大学',
        code: 'HKUST',
        logo: '科',
        desc: '适合已确认入读港科大的学生，清单覆盖签证、注册、住宿和日常准备。'
      },
      {
        key: 'hku',
        name: '香港大学',
        code: 'HKU',
        logo: '港',
        desc: '适合已确认入读港大的学生，清单覆盖 HKU Portal、注册、住宿和生活安排。'
      }
    ],
    hkustList: [],
    hkuList: [],
    hkustProgress: 0,
    hkuProgress: 0,
    hkustDone: 0,
    hkuDone: 0,
    currentList: [],
    currentProgress: 0,
    currentDone: 0,
    currentSchoolName: '',
    currentSchoolCode: '',
    currentTheme: 'hkust',
    currentBoxClass: 'box-hkust'
  },

  onLoad() {
    const selectedUni = wx.getStorageSync('selectedChecklistUni') || ''
    if (selectedUni) {
      this.setData({ activeUni: selectedUni })
    }
    this.loadChecklists()
  },

  onShow() {
    this.loadChecklists()
  },

  _storageKey(uni) {
    const openid = getApp().globalData.openid || ''
    return openid ? `checklist_${uni}_${openid}` : `checklist_${uni}`
  },

  _setCurrentChecklist(data = this.data) {
    const uni = data.activeUni
    if (!uni) {
      this.setData({
        currentList: [],
        currentProgress: 0,
        currentDone: 0,
        currentSchoolName: '',
        currentSchoolCode: '',
        currentTheme: 'hkust',
        currentBoxClass: 'box-hkust'
      })
      return
    }

    const school = data.universities.find(i => i.key === uni)
    const isHkust = uni === 'hkust'
    this.setData({
      currentList: isHkust ? data.hkustList : data.hkuList,
      currentProgress: isHkust ? data.hkustProgress : data.hkuProgress,
      currentDone: isHkust ? data.hkustDone : data.hkuDone,
      currentSchoolName: school ? school.name : '',
      currentSchoolCode: school ? school.code : '',
      currentTheme: uni,
      currentBoxClass: isHkust ? 'box-hkust' : 'box-hku'
    })
  },

  loadChecklists() {
    const savedHkust = wx.getStorageSync(this._storageKey('hkust')) || {}
    const savedHku   = wx.getStorageSync(this._storageKey('hku'))   || {}

    const hkustList = HKUST_CHECKLIST.map(i => ({ ...i, checked: !!savedHkust[i.id] }))
    const hkuList   = HKU_CHECKLIST.map(i =>   ({ ...i, checked: !!savedHku[i.id]   }))

    const hkustDone = hkustList.filter(i => i.checked).length
    const hkuDone   = hkuList.filter(i => i.checked).length
    const hkustProgress = Math.round(hkustDone / hkustList.length * 100)
    const hkuProgress   = Math.round(hkuDone   / hkuList.length   * 100)

    this.setData({ hkustList, hkuList, hkustProgress, hkuProgress, hkustDone, hkuDone }, () => {
      this._setCurrentChecklist()
    })
  },

  onSelectUni(e) {
    const uni = e.currentTarget.dataset.uni
    wx.setStorageSync('selectedChecklistUni', uni)
    this.setData({ activeUni: uni }, () => this._setCurrentChecklist())
  },

  onChangeSchool() {
    wx.removeStorageSync('selectedChecklistUni')
    this.setData({ activeUni: '' }, () => this._setCurrentChecklist())
  },

  onCheckItem(e) {
    const { id } = e.currentTarget.dataset
    const uni = this.data.activeUni
    if (!uni) return
    const listKey     = uni === 'hkust' ? 'hkustList'     : 'hkuList'
    const progressKey = uni === 'hkust' ? 'hkustProgress' : 'hkuProgress'
    const doneKey     = uni === 'hkust' ? 'hkustDone'     : 'hkuDone'
    const storageKey  = this._storageKey(uni)

    const list = this.data[listKey].map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    const done     = list.filter(i => i.checked).length
    const progress = Math.round(done / list.length * 100)

    const saved = {}
    list.forEach(i => { if (i.checked) saved[i.id] = true })
    wx.setStorageSync(storageKey, saved)

    this.setData({ [listKey]: list, [progressKey]: progress, [doneKey]: done }, () => {
      this._setCurrentChecklist()
    })
  },

  onResetChecklist() {
    const uni = this.data.activeUni
    wx.showModal({
      title: '重置清单',
      content: '确定清空所有已勾选项目？',
      confirmText: '重置',
      confirmColor: '#FF3B30',
      success: res => {
        if (!res.confirm) return
        const listKey     = uni === 'hkust' ? 'hkustList'     : 'hkuList'
        const progressKey = uni === 'hkust' ? 'hkustProgress' : 'hkuProgress'
        const doneKey     = uni === 'hkust' ? 'hkustDone'     : 'hkuDone'
        const storageKey  = this._storageKey(uni)
        const list = this.data[listKey].map(i => ({ ...i, checked: false }))
        wx.setStorageSync(storageKey, {})
        this.setData({ [listKey]: list, [progressKey]: 0, [doneKey]: 0 }, () => {
          this._setCurrentChecklist()
        })
      }
    })
  }
})
