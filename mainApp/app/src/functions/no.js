function no() {
    var data = 'https://i.imgur.com/9985gzf.gif'
      var shock = document.createElement('div');
      var img = new Image;
      img.src = data;
      img.style.width = '500px';
      img.style.height = '500px';
      img.style.transition = '1s all';
      img.style.position = 'fixed';
      img.style.left = 'calc(50% - 250px)';
      img.style.bottom = '-600px';
      img.style.zIndex = 999999;
  
      document.body.appendChild(img);
  
      window.setTimeout(function () {
        img.style.bottom = '0px';
      }, 30);
  
      window.setTimeout(function () {
        img.style.bottom = '-600px';
      }, 4300);
      window.setTimeout(function () {
        img.parentNode.removeChild(img);
        shock.parentNode.removeChild(shock);
      }, 5400);
  
    };

    export default no;
