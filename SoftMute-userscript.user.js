// ==UserScript==
// @name        Soft Mute
// @namespace   Violentmonkey Scripts
// @match       *://twitter.com/*
// @version     1.1.0
// @author      Assistant
// @description Allows you to soft mute users to avoid seeing their content on your home, but still allows them to interact with you.
// @homepageURL https://github.com/Assistant/SoftMute
// @updateURL   https://raw.githubusercontent.com/Assistant/SoftMute/master/SoftMute-userscript.user.js
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@1
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_xmlhttpRequest
// ==/UserScript==

const mapURL = GM_getValue('mapURL', 'https://sm.assistant.moe')
/*
 * mapURL is queried with each username on your mute list 
 * in order to get the user ID of the user.
 * This allows the script to block posts that do not directly contain the user
 * but appear on your home because of that user (e.g., User liked, User follows, etc)
 * as the links on those posts to the user being muted appear in the format
 * twitter.com/i/user/<user ID> instead of twitter.com/<username>.
 * Note: setti
 *
 * These queries are not stored in my server, however if you have a healthy distrust
 * you can change the `mapURL` variable in your userscript manager to the URL 
 * of a different endpoint that performs the same action, or an empty string 
 * to disable this feature entirely.
 * (or change it in the code above, but that will be overwritten on updates)
 * 
 * The endpoint should take in a POST request with a urlencoded form of the follwing
 * shape: `input=<username>`, and respond with a string only containing the
 * corresponding user ID, without a trailing newline.
 * 
 * You can see my implementation at https://github.com/Assistant/TwitterUsername2ID
 * While I do not recommend that you use it because I have no idea who runs it,
 * https://tweeterid.com/ajax.php is an example endpoint that implements the feature
 * correctly. But again, that is run by an unknown 3rd-party, if you have privacy
 * concerns you should really host your own endpoint, feel free to use my code.
 */

const overlaps = (arr1, arr2) => arr1.filter((elem) => arr2.indexOf(elem) !== -1).length > 0
const reducer = (accumulator, current) => {
  const url = current.getAttribute('href')
  if (/^\/[^/]+$/.test(url)) {
    accumulator.push(url)
    return accumulator
  }
  if (/^\/i\/user\/[0-9]+$/.test(url)) accumulator.push(url.replace(/^[\/iuser]+/, ''))
  return accumulator
}
const getPeople = (post) => Array.from(post.getElementsByTagName('a')).reduce(reducer, [])
const getCookieValue = name => document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || ''
const darkMode = getCookieValue('night_mode')
const ids = {}
const getID = async (name) => {
  if(ids.hasOwnProperty(name)) return
  GM_xmlhttpRequest({
    url: mapURL,
    method: 'post',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    anonymous: true,
    data: `input=${name}`,
    onload: (response) => {
      const id = response.responseText
      if(!ids.hasOwnProperty(name)) {
        ids[name] = id
        run()
      }
    }
  })
}
GM_getValue('muted', []).forEach(getID)
let menuAdded = false

VM.observe(document.body, () => {
  if (!menuAdded) {
    addMenu()
    menuAdded = true
  }
  if ('/home' === location.pathname) {
    run()
  }
})

const run = () => {
  const muted = GM_getValue('muted', []).map(user => '/'+user)
  const mutedIDs = Object.values(ids)
  const posts = Array.from(document.getElementsByTagName('article'))
  posts.forEach(post => {
    const users = getPeople(post)
    const overlap = overlaps([...muted, ...mutedIDs], users)
    if (overlap) {
      post.parentElement.parentElement.parentElement.style.display = 'none'
    }
  })
}

const addMenu = () => {
  const nav = document.getElementsByTagName('nav')[0]
  const menu = document.createElement('div')
  const inputMenu = document.createElement('div')
  const menuHeaderContainer = document.createElement('div')
  const menuHeader = document.createElement('div')
  const textArea = document.createElement('textarea')
  const close = document.createElement('div')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  
  const arrayToList = (array) => array.join('\n')
  const listToArray = (list) => list.split('\n')
  const saveList = function() {
    const names = listToArray(textArea.value)
    names.forEach(getID)
    GM_setValue('muted', names)
    run()
  }
  
  menu.onmouseover = function() {
    this.style.backgroundColor = themeMap[darkMode]['iconHover']
  }
  menu.onmouseout = function() {
    this.style.backgroundColor = ''
  }
  menu.onclick = function() {
    if (inputMenu.style.display === 'none') {
      inputMenu.style.top = 'calc(50% - 16rem)'
      inputMenu.style.display = 'block'
    } else {
      inputMenu.style.display = 'none'
      saveList()
    }
  }
  
  close.onclick = function() {
    inputMenu.style.display = 'none'
    saveList()
  }
  
  menu.style.cursor = 'pointer'
  menu.style.transitionProperty = 'background-color, box-shadow'
  menu.style.transitionDuration = '0.2s'
  menu.style.alignItems = 'center'
  menu.style.justifyContent = 'center'
  menu.style.flexDirection = 'row'
  menu.style.maxWidth = '100%'
  menu.style.padding = '12px'
  menu.style.borderRadius = '9999px'
  menu.style.border = '0 solid black'
  menu.style.boxSizing = 'border-box'
  menu.style.display = 'flex'
  menu.style.flexBasis = 'auto'
  menu.style.flexShrink = '0'
  menu.style.margin = '0'
  menu.style.maxWidth = '50.25px'
  menu.style.minHeight = '0'
  menu.style.minWidth = '0'
  menu.style.position = 'relative'
  menu.style.zIndex = '0'
  
  svg.style.color = themeMap[darkMode]['svgColor']
  svg.style.height = '1.75rem'
  svg.style.userSelect = 'none'
  svg.style.verticalAlign = 'text-bottom'
  svg.style.position = 'relative'
  svg.style.maxWidth = '100%'
  svg.style.fill = 'currentcolor'
  svg.style.display = 'inline-block'
  svg.setAttributeNS('http://www.w3.org/2000/svg', 'viewBox', '0 0 24 24')
  svg.setAttributeNS('http://www.w3.org/2000/svg', 'preserveAspectRatio', 'xMaxYMax meet')
  
  svg.innerHTML = '<g><path d="M1.75 22.354c-.192 0-.384-.073-.53-.22-.293-.293-.293-.768 0-1.06L20.395 1.898c.293-.294.768-.294 1.06 0s.294.767 0 1.06L2.28 22.135c-.146.146-.338.22-.53.22zm1.716-5.577c-.134 0-.27-.036-.392-.11-.67-.413-1.07-1.13-1.07-1.917v-5.5c0-1.24 1.01-2.25 2.25-2.25H6.74l7.047-5.588c.225-.18.533-.215.792-.087.258.125.423.387.423.675v3.28c0 .415-.336.75-.75.75s-.75-.335-.75-.75V3.553L7.47 8.338c-.134.104-.298.162-.467.162h-2.75c-.413 0-.75.337-.75.75v5.5c0 .263.134.5.356.64.353.216.462.678.245 1.03-.14.23-.387.357-.64.357zm10.787 5.973c-.166 0-.33-.055-.466-.162l-4.795-3.803c-.325-.258-.38-.73-.122-1.054.258-.322.73-.38 1.054-.12l3.58 2.838v-7.013c0-.414.335-.75.75-.75s.75.336.75.75V22c0 .288-.166.55-.425.675-.104.05-.216.075-.327.075z"></path></g>'

  inputMenu.style.display = 'none'
  inputMenu.style.minWidth = '28rem'
  inputMenu.style.height = '32rem'
  inputMenu.style.overflow = 'hidden'
  inputMenu.style.top = 'calc(50% - 16rem)'
  inputMenu.style.left = 'calc(50% - 14rem)'
  inputMenu.style.boxShadow = themeMap[darkMode]['boxShadow']
  inputMenu.style.backgroundColor = themeMap[darkMode]['background']
  inputMenu.style.top = '0'
  inputMenu.style.position = 'fixed'
  inputMenu.style.borderRadius = '4px'
  
  menuHeaderContainer.style.borderBottom = themeMap[darkMode]['border']
  menuHeaderContainer.style.color = themeMap[darkMode]['textColor']
  menuHeaderContainer.style.height = '3rem'
  menuHeaderContainer.style.fontFamily = '"Segoe UI", Meiryo, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

  menuHeader.innerText = 'Mute list, one username per line'
  menuHeader.style.textAlign = 'center'
  menuHeader.style.lineHeight = '3rem'
  
  close.innerText = '×'
  close.style.position = 'relative'
  close.style.width = 'fit-content'
  close.style.top = '-3rem'
  close.style.color = themeMap[darkMode]['textColor']
  close.style.left = '26rem'
  close.style.cursor = 'pointer'
  close.style.fontSize = '2.5rem'
  
  textArea.value = arrayToList(GM_getValue('muted', []))
  textArea.style.width = 'calc(100% - 2rem)'
  textArea.style.outline = 'none'
  textArea.style.height = '27rem'
  textArea.style.backgroundColor = 'transparent'
  textArea.style.padding = '1rem'
  textArea.style.border = '0'
  textArea.style.color = themeMap[darkMode]['textColor']
  textArea.style.resize = 'none'
  textArea.style.fontFamily = '"Segoe UI", Meiryo, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  textArea.setAttribute('spellcheck', 'false')

  
  menuHeaderContainer.appendChild(menuHeader)
  menuHeaderContainer.appendChild(close)
  
  inputMenu.appendChild(menuHeaderContainer)
  inputMenu.appendChild(textArea)
  
  menu.appendChild(svg)

  nav.appendChild(menu)
  nav.appendChild(inputMenu)
}

const themeMap = [
  {
    'textColor': 'rgb(15, 20, 25)',
    'svgColor': 'rgb(15, 20, 25)',
    'iconHover': 'rgba(15, 20, 25, 0.1)',
    'boxShadow': 'rgba(101, 119, 134, 0.2) 0px 0px 15px, rgba(101, 119, 134, 0.15) 0px 0px 3px 1px',
    'background': 'rgb(255,255,255)',
    'border': '1px solid rgb(239, 243, 244)'
  },
  {
    'textColor': 'rgb(247, 249, 249)',
    'svgColor': 'rgb(247, 249, 249)',
    'iconHover': 'rgba(247, 249, 249, 0.1)',
    'boxShadow': 'rgba(136, 153, 166, 0.2) 0px 0px 15px, rgba(136, 153, 166, 0.15) 0px 0px 3px 1px',
    'background': 'rgb(21, 32, 43)',
    'border': '1px solid rgb(56, 68, 77)'
  },
  {
    'textColor': 'rgb(231, 233, 234)',
    'svgColor': 'rgb(231, 233, 234)',
    'iconHover': 'rgba(231, 233, 234, 0.1)',
    'boxShadow': 'rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px',
    'background': 'rgb(0, 0, 0)',
    'border': '1px solid rgb(47, 51, 54)'
  }
]
