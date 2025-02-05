const {ipcRenderer} = require('electron');

var searchInput = document.querySelector('.js-search');
var title = document.querySelector('h1');
var images = [];

var searching = false;

function isCompatibleURL(str) {
  var pattern = /^https?:\/\/(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:\/[^\/#?]+)+\.(?:jpe?g|gif|png|bmp)$/i;
  return pattern.test(str);
}

function search(query) {
  if (searching) {
    clearTimeout(searching);
  }
  if (query.trim() == '') {
    addImageResults(images);
  } else {
    searching = setTimeout(function() {
      var results = images.filter(function(image) {
        return (image.keywords.match(query) || image.url == query) && image;
      });
      addImageResults(results);
      if (results.length == 0) {
        if (isCompatibleURL(query)) {
          setupAddNewImage(query);
        }
      }
    }, 100);
  }
}

function addToLibrary() {
  var url = searchInput.value;
  var tags = document.getElementById('tags').value;

  var obj = {
    url: url,
    keywords: tags,
  };

  ipcRenderer.send('add-to-library', obj);
}

function sizeInBytes(url, elem) {
  var xhr = new XMLHttpRequest();
  xhr.open('HEAD', url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        elem.innerHTML = fileSizeSI(xhr.getResponseHeader('Content-Length'));
      }
    }
  };
  xhr.send(null);
}

function fileSizeSI(a, b, c, d, e) {
  return (
    ((b = Math),
    (c = b.log),
    (d = 1e3),
    (e = (c(a) / c(d)) | 0),
    a / b.pow(d, e)).toFixed(2) +
    ' ' +
    (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes')
  );
}

function setupAddNewImage(query) {
  var button = document.createElement('button');
  button.innerText = 'Add to library..';
  button.setAttribute('id', 'add-to-library');
  button.setAttribute('onclick', 'addToLibrary()');

  var input = document.createElement('input');
  input.setAttribute('id', 'tags');
  input.setAttribute('type', 'text');

  var text1 = document.createElement('p');
  text1.innerText = 'Enter tags ';
  text1.appendChild(input);

  var text2 = document.createElement('p');
  text2.innerText = 'Hit enter to ';
  text2.appendChild(button);

  document.getElementById('images').appendChild(text1);
  document.getElementById('images').appendChild(text2);
}

function addImageResult(element, index, array) {
  var elem = document.createElement('img');
  elem.setAttribute('src', element.url);
  elem.setAttribute('width', '100%');

  var wrap = document.createElement('a');
  wrap.setAttribute('class', 'wrapper');
  wrap.setAttribute('href', '#');
  wrap.addEventListener('click', killEvent);
  wrap.addEventListener('dblclick', sendImageDblClick);

  var tags = document.createElement('p');
  tags.setAttribute('class', 'tags');
  tags.innerText = element.keywords;

  var sizeElem = document.createElement('span');
  sizeElem.setAttribute('class', 'filesize');

  sizeInBytes(element.url, sizeElem);

  wrap.appendChild(elem);
  wrap.appendChild(sizeElem);
  wrap.appendChild(tags);

  document.getElementById('images').appendChild(wrap);
}

function killEvent(event) {
  event.preventDefault();
}

function sendImageDblClick(event) {
  var element = event.currentTarget.children[0];
  sendImage(element);
}

function sendImage(element) {
  ipcRenderer.send('url-to-clipboard', element.src);
}

function deleteImage(element) {
  ipcRenderer.send('remove-from-library', element.src);
}

function addImageResults(data) {
  var node = document.getElementById('images');
  var last;
  while ((last = node.lastChild)) node.removeChild(last);
  data.forEach(addImageResult);
}

searchInput.focus();
searchInput.addEventListener('input', function(event) {
  search(this.value);
});

document.getElementById('quit').addEventListener('click', function(event) {
  ipcRenderer.send('quit');
});

document
  .getElementById('select-library')
  .addEventListener('click', function(event) {
    ipcRenderer.send('select-library');
  });

document.addEventListener('keydown', function(event) {
  var node = document.getElementById('images');
  var first = node.querySelector('a.wrapper');
  if (event.keyCode == 38) {
    if (event.target.className.match('wrapper')) {
      element = event.target.previousSibling;
      element.focus();
      element.scrollIntoView();
      killEvent(event);
    }
  } else if (event.keyCode == 40) {
    if (event.target.className.match('js-search')) {
      first.focus();
      killEvent(event);
    } else if (event.target.className.match('wrapper')) {
      element = event.target.nextSibling;
      element.focus();
      element.scrollIntoView();
      killEvent(event);
    }
  } else if (event.keyCode == 13) {
    if (event.target.className.match('wrapper')) {
      sendImage(event.target.children[0]);
    } else if (event.target.id == 'tags') {
      addToLibrary();
    }
  } else if (event.keyCode == 8) {
    if (event.target.className.match('wrapper')) {
      deleteImage(event.target.children[0]);
    }
  }
});

ipcRenderer.on('data-added', function(event, data) {
  images = data;
  searchInput.value = '';
  search('');
});

ipcRenderer.on('show', function() {
  searchInput.focus();
  window.scrollTo(0, 0);
});

ipcRenderer.on('save-error', function(err) {
  alert('Error saving - ' + err);
});
