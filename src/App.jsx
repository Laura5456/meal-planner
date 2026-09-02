import { useState, useEffect, useRef } from 'react'
import { toPng } from 'html-to-image'

export default function App() {
  // 1. 食譜資料庫狀態 (含 LocalStorage)
  const [recipes, setRecipes] = useState(() => {
    const savedRecipes = localStorage.getItem('meal_planner_recipes')
    if (savedRecipes) {
      try { return JSON.parse(savedRecipes) } catch (e) { console.error(e) }
    }
    return [
      { id: 1, name: '番茄炒蛋', category: '主菜', ingredients: '番茄 2顆, 雞蛋 3顆, 蔥 1根' }
    ]
  })

  useEffect(() => {
    localStorage.setItem('meal_planner_recipes', JSON.stringify(recipes))
  }, [recipes])

  // 新增食譜用的表單狀態
  const [name, setName] = useState('')
  const [category, setCategory] = useState('主菜')
  const [ingredients, setIngredients] = useState('')

  // 編輯食譜用的狀態 (記錄目前正在編輯哪一個食譜 ID)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('主菜')
  const [editIngredients, setEditIngredients] = useState('')

  // 搜尋與篩選狀態
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('全部')

  // 2. 日期與每週導航狀態
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const getWeekDays = (startDate) => {
    const days = []
    const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const month = d.getMonth() + 1
      const date = d.getDate()
      const dateKey = d.toISOString().split('T')[0]
      days.push({
        name: dayNames[i],
        dateStr: `${month}/${date}`,
        dateKey: dateKey
      })
    }
    return days
  }

  const currentWeekDays = getWeekDays(currentWeekStart)
  const weekKey = currentWeekStart.toISOString().split('T')[0]

  // 3. 每週菜單排程狀態
  const [weeklyPlans, setWeeklyPlans] = useState(() => {
    const savedPlans = localStorage.getItem('meal_planner_weekly_plans')
    if (savedPlans) {
      try { return JSON.parse(savedPlans) } catch (e) { console.error(e) }
    }
    return {}
  })

  useEffect(() => {
    localStorage.setItem('meal_planner_weekly_plans', JSON.stringify(weeklyPlans))
  }, [weeklyPlans])

  const currentWeekPlan = weeklyPlans[weekKey] || {
    星期一: [], 星期二: [], 星期三: [], 星期四: [], 星期五: [], 星期六: [], 星期日: []
  }

  const updateCurrentWeekPlan = (newDayData) => {
    setWeeklyPlans({
      ...weeklyPlans,
      [weekKey]: newDayData
    })
  }

  // 4. 採買清單勾選狀態
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem('meal_planner_checked_items')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { console.error(e) }
    }
    return {}
  })

  useEffect(() => {
    localStorage.setItem('meal_planner_checked_items', JSON.stringify(checkedItems))
  }, [checkedItems])

  const weekCheckedMap = checkedItems[weekKey] || {}

  const handleToggleCheck = (ingredientKey) => {
    const newWeekChecked = {
      ...weekCheckedMap,
      [ingredientKey]: !weekCheckedMap[ingredientKey]
    }
    setCheckedItems({
      ...checkedItems,
      [weekKey]: newWeekChecked
    })
  }

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  const handleThisWeek = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  const handleAddRecipe = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const newRecipe = { id: Date.now(), name, category, ingredients }
    setRecipes([...recipes, newRecipe])
    setName('')
    setIngredients('')
  }

  const handleDeleteRecipe = (id) => {
    setRecipes(recipes.filter(recipe => recipe.id !== id))
  }

  const handleStartEdit = (recipe) => {
    setEditingId(recipe.id)
    setEditName(recipe.name)
    setEditCategory(recipe.category)
    setEditIngredients(recipe.ingredients)
  }

  const handleSaveEdit = (id) => {
    if (!editName.trim()) return
    setRecipes(recipes.map(recipe => {
      if (recipe.id === id) {
        return { ...recipe, name: editName, category: editCategory, ingredients: editIngredients }
      }
      return recipe
    }))
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleAddToDay = (dayName, recipe) => {
    const scheduledItem = { ...recipe, scheduleId: Date.now() + Math.random() }
    const updatedDay = {
      ...currentWeekPlan,
      [dayName]: [...currentWeekPlan[dayName], scheduledItem]
    }
    updateCurrentWeekPlan(updatedDay)
  }

  const handleRemoveFromDay = (dayName, scheduleId) => {
    const updatedDay = {
      ...currentWeekPlan,
      [dayName]: currentWeekPlan[dayName].filter(item => item.scheduleId !== scheduleId)
    }
    updateCurrentWeekPlan(updatedDay)
  }

  const handleDragStart = (e, recipe) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(recipe))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, dayName) => {
    e.preventDefault()
    const dataStr = e.dataTransfer.getData('text/plain')
    if (!dataStr) return
    try {
      const recipe = JSON.parse(dataStr)
      handleAddToDay(dayName, recipe)
    } catch (err) {
      console.error(err)
    }
  }

  const startDateStr = `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()}`
  const endDateObj = new Date(currentWeekStart)
  endDateObj.setDate(endDateObj.getDate() + 6)
  const endDateStr = `${endDateObj.getMonth() + 1}/${endDateObj.getDate()}`

  const navButtonStyle = {
    padding: '0.4rem 0.8rem',
    background: '#e2e8f0',
    border: '1px solid #94a3b8',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#1e293b'
  }

  const scheduleBtnStyle = {
    background: '#e0f2fe',
    border: '1px solid #bae6fd',
    color: '#0369a1',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: '500'
  }

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategoryFilter === '全部' || recipe.category === selectedCategoryFilter
    return matchesSearch && matchesCategory
  })

  // 智慧採買清單累加邏輯
  const getAggregatedShoppingList = () => {
    const ingredientMap = {}

    Object.values(currentWeekPlan).forEach(dayItems => {
      dayItems.forEach(item => {
        if (!item.ingredients) return
        const parts = item.ingredients.split(/[,，]/)
        
        parts.forEach(part => {
          const trimmed = part.trim()
          if (!trimmed) return

          const match = trimmed.match(/^(.+?)\s+(\d+(\.\d+)?)\s*([^\d\s]*)$/)

          if (match) {
            const nameKey = match[1].trim()
            const amount = parseFloat(match[2])
            const unit = match[4] || ''
            const numericKey = nameKey

            if (!ingredientMap[numericKey]) {
              ingredientMap[numericKey] = { name: nameKey, totalAmount: 0, unit: unit }
            }
            ingredientMap[numericKey].totalAmount += amount
          } else {
            const mapKey = trimmed
            if (!ingredientMap[mapKey]) {
              ingredientMap[mapKey] = { name: trimmed, totalAmount: 0, unit: '次' }
            }
            ingredientMap[mapKey].totalAmount += 1
          }
        })
      })
    })

    return Object.values(ingredientMap).map(item => {
      if (item.unit === '次') {
        return `${item.name} (共 ${item.totalAmount} 次)`
      } else if (item.unit) {
        return `${item.name} ${item.totalAmount}${item.unit}`
      } else {
        return `${item.name} ${item.totalAmount}`
      }
    })
  }

  const shoppingList = getAggregatedShoppingList()

  // 匯出功能 1：文字檔備份
  const handleExportText = () => {
    let content = `=== 🍳 每週菜單與採買清單 ===\n`
    content += `週次範圍：${startDateStr} ~ ${endDateStr}\n\n`
    
    content += `【每日菜單排程】\n`
    currentWeekDays.forEach(dayInfo => {
      content += `[${dayInfo.name} (${dayInfo.dateStr})]\n`
      const items = currentWeekPlan[dayInfo.name]
      if (items.length === 0) {
        content += `  (無安排)\n`
      } else {
        items.forEach(item => {
          content += `  - ${item.name} (${item.category}) | 食材: ${item.ingredients || '無'}\n`
        })
      }
      content += `\n`
    })

    content += `【本週智慧採買清單】\n`
    if (shoppingList.length === 0) {
      content += `  (本週無採買需求)\n`
    } else {
      shoppingList.forEach(ing => {
        content += `  [ ] ${ing}\n`
      })
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `每週菜單_${startDateStr.replace('/', '-')}_${endDateStr.replace('/', '-')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 匯出功能 2：將排程區塊截圖成圖片 (.png)
  const scheduleRef = useRef(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportImage = () => {
    if (scheduleRef.current === null) return
    setIsExporting(true)
    toPng(scheduleRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = `每週菜單排程_${startDateStr.replace('/', '-')}_${endDateStr.replace('/', '-')}.png`
        link.href = dataUrl
        link.click()
        setIsExporting(false)
      })
      .catch((err) => {
        console.error('圖片匯出失敗', err)
        setIsExporting(false)
        alert('匯出圖片時發生錯誤，請稍後再試！')
      })
  }

  // 匯出功能 3：將採買清單區塊截圖成圖片 (.png)
  const shoppingRef = useRef(null)
  const [isExportingShopping, setIsExportingShopping] = useState(false)

  const handleExportShoppingImage = () => {
    if (shoppingRef.current === null) return
    setIsExportingShopping(true)
    toPng(shoppingRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = `本週採買清單_${startDateStr.replace('/', '-')}_${endDateStr.replace('/', '-')}.png`
        link.href = dataUrl
        link.click()
        setIsExportingShopping(false)
      })
      .catch((err) => {
        console.error('採買清單圖片匯出失敗', err)
        setIsExportingShopping(false)
        alert('匯出採買清單圖片時發生錯誤，請稍後再試！')
      })
  }

  // 複製採買清單到剪貼簿
  const [copyStatus, setCopyStatus] = useState(false)
  const handleCopyShoppingList = () => {
    if (shoppingList.length === 0) {
      alert('目前沒有採買清單可以複製！')
      return
    }
    const text = `🛒 採買清單 (${startDateStr} ~ ${endDateStr})\n` + shoppingList.map(ing => `・[ ] ${ing}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(true)
      setTimeout(() => setCopyStatus(false), 2000)
    })
  }

  const row1Days = currentWeekDays.slice(0, 3)
  const row2Days = currentWeekDays.slice(3, 7)

  const renderDayCard = (dayInfo) => (
    <div 
      key={dayInfo.dateKey}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, dayInfo.name)}
      style={{ 
        background: '#fff', 
        padding: '0.8rem 0.6rem', 
        borderRadius: '8px', 
        border: '2px dashed #cbd5e1', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
          {dayInfo.name.replace('星期', '週')}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginTop: '0.1rem' }}>
          {dayInfo.dateStr}
        </div>
      </div>
      
      {currentWeekPlan[dayInfo.name].length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, textAlign: 'center', fontStyle: 'italic', lineHeight: '1.4' }}>
            拖曳或點擊<br/>食譜至此
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.2rem' }}>
          {currentWeekPlan[dayInfo.name].map((item) => (
            <div 
              key={item.scheduleId} 
              style={{ 
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.82rem',
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.15rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 'bold', color: '#334155', wordBreak: 'break-all', fontSize: '0.85rem', lineHeight: '1.2' }}>
                  {item.name}
                </span>
                <button 
                  onClick={() => handleRemoveFromDay(dayInfo.name, item.scheduleId)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}
                  title="移除"
                >
                  ✕
                </button>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#e2e8f0', padding: '0.02rem 0.3rem', borderRadius: '3px', alignSelf: 'flex-start' }}>
                {item.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem 2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>🍳 每週菜單與採買清單</h1>

      <div style={{ background: '#f0f4f8', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #d9e2ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.3rem 0', color: '#1e293b', fontSize: '1.2rem' }}>📅 每週菜單排程</h2>
          <span style={{ color: '#555', fontSize: '0.95rem' }}>
            目前檢視週次：<strong>{currentWeekStart.getFullYear()}年 ({startDateStr} ~ {endDateStr})</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handlePrevWeek} style={navButtonStyle}>◀ 上一週</button>
          <button onClick={handleThisWeek} style={{ ...navButtonStyle, background: '#cbd5e1' }}>回到本週</button>
          <button onClick={handleNextWeek} style={navButtonStyle}>下一週 ▶</button>
          <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 0.2rem' }}></div>
          <button 
            onClick={handleExportText} 
            style={{ ...navButtonStyle, background: '#64748b', color: '#fff', border: 'none' }}
            title="下載本週菜單與採買清單文字檔"
          >
            📄 匯出備份檔
          </button>
          <button 
            onClick={handleExportImage} 
            disabled={isExporting}
            style={{ ...navButtonStyle, background: '#0ea5e9', color: '#fff', border: 'none', opacity: isExporting ? 0.7 : 1 }}
            title="將本週菜單排程截圖匯出成圖片"
          >
            {isExporting ? '📸 處理中...' : '📥 匯出菜單圖片'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '1.5rem', alignItems: 'stretch', marginBottom: '2rem' }}>
        
        {/* 左側：食譜清單 */}
        <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#1e293b' }}>
            📖 食譜清單 ({filteredRecipes.length} / {recipes.length})
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '-0.5rem', marginBottom: '0.8rem' }}>
            💡 提示：按住卡片可拖曳至右側；點擊「編輯」可直接修改。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="搜尋食譜或食材..." 
              style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
            />
            <select 
              value={selectedCategoryFilter} 
              onChange={(e) => setSelectedCategoryFilter(e.target.value)} 
              style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%' }}
            >
              <option value="全部">全部分類</option>
              <option value="主菜">主菜</option>
              <option value="配菜">配菜</option>
              <option value="湯品">湯品</option>
              <option value="其他">其他</option>
            </select>
          </div>

          {recipes.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>目前尚無食譜，請在下方新增。</p>
          ) : filteredRecipes.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>找不到符合的食譜。</p>
          ) : (
            <div style={{ flex: 1, minHeight: '600px', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {filteredRecipes.map((recipe) => {
                const isEditing = editingId === recipe.id

                return (
                  <div 
                    key={recipe.id} 
                    draggable={!isEditing} 
                    onDragStart={(e) => handleDragStart(e, recipe)}
                    style={{ 
                      padding: '0.8rem', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px', 
                      background: '#fff', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      cursor: isEditing ? 'default' : 'grab',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    title={isEditing ? '' : '可直接按住拖曳至右側星期'}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                            placeholder="食譜名稱"
                            style={{ flex: 1, padding: '0.3rem', fontSize: '0.9rem' }}
                          />
                          <select 
                            value={editCategory} 
                            onChange={(e) => setEditCategory(e.target.value)}
                            style={{ padding: '0.3rem', fontSize: '0.9rem' }}
                          >
                            <option value="主菜">主菜</option>
                            <option value="配菜">配菜</option>
                            <option value="湯品">湯品</option>
                            <option value="其他">其他</option>
                          </select>
                        </div>
                        <input 
                          type="text" 
                          value={editIngredients} 
                          onChange={(e) => setEditIngredients(e.target.value)} 
                          placeholder="所需食材（逗號分隔）"
                          style={{ width: '100%', padding: '0.3rem', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <button 
                            onClick={handleCancelEdit}
                            style={{ background: '#e2e8f0', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            取消
                          </button>
                          <button 
                            onClick={() => handleSaveEdit(recipe.id)}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            儲存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div>
                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>📄 {recipe.name}</span>
                            <span style={{ marginLeft: '0.4rem', background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.7rem', color: '#475569' }}>
                              {recipe.category}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button 
                              onClick={() => handleStartEdit(recipe)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', padding: 0, fontWeight: '500' }}
                            >
                              編輯
                            </button>
                            <button 
                              onClick={() => handleDeleteRecipe(recipe.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        
                        <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.8rem' }}>
                          {recipe.ingredients}
                        </p>

                        <div style={{ borderTop: '1px dashed #f1f5f9', paddingTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', alignSelf: 'center', marginRight: '0.1rem' }}>排入:</span>
                          {currentWeekDays.map((dayInfo) => (
                            <button
                              key={dayInfo.dateKey}
                              onClick={() => handleAddToDay(dayInfo.name, recipe)}
                              style={scheduleBtnStyle}
                              title={`排入 ${dayInfo.name}`}
                            >
                              {dayInfo.name.replace('星期', '')}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 右側：星期排程區塊 */}
        <div 
          ref={scheduleRef} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            flex: 1, 
            justifyContent: 'center',
            background: '#ffffff',
            padding: '1rem',
            borderRadius: '8px'
          }}
        >
          {/* 上排 3 天 */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div style={{ flex: '0.1', height: '350px', minWidth: '180px' }}>
              {renderDayCard(row1Days[0])}
            </div>
            <div style={{ flex: '0.1', height: '350px', minWidth: '180px' }}>
              {renderDayCard(row1Days[1])}
            </div>
            <div style={{ flex: '0.1', height: '350px', minWidth: '180px' }}>
              {renderDayCard(row1Days[2])}
            </div>
          </div>

          {/* 下排 4 天 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(170px, 1fr))', gap: '1rem' }}>
            {row2Days.map((dayInfo) => (
              <div key={dayInfo.dateKey} style={{ height: '350px' }}>
                {renderDayCard(dayInfo)}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 本週智慧採買清單 (加上 ref 供截圖使用) */}
      <div 
        ref={shoppingRef}
        style={{ background: '#fdf4ff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #f0abfc' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, color: '#86198f', fontSize: '1.2rem' }}>🛒 本週智慧採買清單 ({startDateStr} ~ {endDateStr})</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleCopyShoppingList}
              style={{ 
                background: copyStatus ? '#10b981' : '#c084fc', 
                color: '#fff', 
                border: 'none', 
                padding: '0.35rem 0.8rem', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '0.85rem', 
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
            >
              {copyStatus ? '✓ 已複製到剪貼簿！' : '📋 一鍵複製採買清單'}
            </button>
            <button 
              onClick={handleExportShoppingImage} 
              disabled={isExportingShopping}
              style={{ 
                background: '#a855f7', 
                color: '#fff', 
                border: 'none', 
                padding: '0.35rem 0.8rem', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '0.85rem', 
                fontWeight: 'bold',
                opacity: isExportingShopping ? 0.7 : 1 
              }}
            >
              {isExportingShopping ? '📸 處理中...' : '📥 匯出採買清單圖片'}
            </button>
          </div>
        </div>

        {shoppingList.length === 0 ? (
          <p style={{ color: '#a21caf', margin: 0, fontSize: '0.95rem' }}>本週尚未安排任何菜色，排入菜單後這裡會自動統計所需食材！</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
            {shoppingList.map((ingredient, index) => {
              const isChecked = !!weekCheckedMap[ingredient]
              return (
                <label 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    background: '#fff', 
                    padding: '0.6rem 0.8rem', 
                    borderRadius: '6px', 
                    border: '1px solid #f5d0fe', 
                    cursor: 'pointer',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    color: isChecked ? '#9ca3af' : '#1f2937',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => handleToggleCheck(ingredient)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>{ingredient}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>➕ 新增食譜到資料庫</h2>
        <form onSubmit={handleAddRecipe} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 1.5fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold', fontSize: '0.9rem' }}>食譜名稱：</label>
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：咖哩飯" 
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold', fontSize: '0.9rem' }}>分類：</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
              <option value="主菜">主菜</option>
              <option value="配菜">配菜</option>
              <option value="湯品">湯品</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold', fontSize: '0.9rem' }}>所需食材（逗號分隔）：</label>
            <input 
              type="text" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="例如：馬鈴薯 2顆, 紅蘿蔔 1條" 
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.5rem 1.2rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '36px' }}>
            ＋ 儲存
          </button>
        </form>
      </div>
    </div>
  )
}