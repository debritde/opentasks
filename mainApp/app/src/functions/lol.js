var lol = function () {
  var data = 'https://i.imgur.com/pAuDT3R.gif'

  var shock = document.createElement('div');
  var img = new Image;
  img.src = data;
  img.style.width = '240px';
  img.style.height = '200px';
  img.style.transition = '1s all';
  img.style.position = 'fixed';
  img.style.left = 'calc(50% - 125px)';
  img.style.bottom = '-250px';
  img.style.zIndex = 999999;

  document.body.appendChild(img);

  window.setTimeout(function () {
    img.style.bottom = '-10px';
  }, 50);

  window.setTimeout(function () {
    img.style.bottom = '-250px';
  }, 3300);

  window.setTimeout(function () {
    img.parentNode.removeChild(img);
    shock.parentNode.removeChild(shock);
  }, 5400);

};

export default lol;