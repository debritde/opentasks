let bravo = function () {
  let data = 'https://i.imgur.com/lbZ5rGI.gif'

  var shock = document.createElement('div')
  var img = new Image()
  img.src = data
  img.style.width = '374px'
  img.style.height = '500px'
  img.style.transition = '1s all'
  img.style.position = 'fixed'
  img.style.left = '-374px'
  img.style.bottom = 'calc(-50% + 450px)'
  img.style.zIndex = 999999

  document.body.appendChild(img)

  window.setTimeout(function () {
    img.style.left = 'calc(50% - 187px)'

    // $('body').css('background', 'salmon')

  }, 50)

  window.setTimeout(function () {
    img.style.left = 'calc(120% + 375px)'

    // $('body').css('background', 'transparent')

  }, 2300)
  window.setTimeout(function () {
    img.parentNode.removeChild(img)


  }, 4300)
};

export default bravo;