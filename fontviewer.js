(function() {
  

function $(id) {
  return document.getElementById(id);
}

var FontViewer = {
    handleFiles: function(e) {
      var file = this.files[0];
      if(file && file.type === 'image/svg+xml') {
        FontViewer.information('Viewing <i>"'+file.name+'</i>".');

        // Clean up
        $('glyphs').innerHTML = '';
        FontViewer.glyphs = {};

        var fileReader = new FileReader(), parser, source;
        fileReader.onload = function(event) {
          try {
            if(window.DOMParser) {
              parser = new DOMParser();
              source = parser.parseFromString(event.target.result, 'text/xml');
            } else {
              source = new ActiveXObject("Microsoft.XMLDOM");
              source.async = 'false';
              source.loadXML(event.target.result);
            }
          } catch(e) {
            FontViewer.information('Invalid SVG font file', true);
          }

          FontViewer.parseSVGFont(source.getElementsByTagName('svg')[0]);
        };
        
        source = fileReader.readAsText(file, 'utf-8');
      } else {
        FontViewer.information('None or invalid file selected', true);
      }
    },

    information: function(str, error) {
      $('information').className = (error) ? 'error' : '';
      $('information').innerHTML = str;
    },

    parseSVGFont: function(svg) {
      var meta = svg.getElementsByTagName('metadata')[0];
      if(meta) {
        $('fontMetadata').innerHTML = meta.textContent.replace('\n', '<br />');
      }

      var fontInfo = svg.getElementsByTagName('font-face')[0], font = svg.getElementsByTagName('font')[0];
      if(fontInfo && fontInfo.getAttribute('font-family')) {
        $('fontName').innerHTML = fontInfo.getAttribute('font-family');
      } else if(font && font.getAttribute('id')) {
        $('fontName').innerHTML = font.getAttribute('id');
      }


      var glyphs = svg.getElementsByTagName('glyph');
      for(var i = 0, length = glyphs.length; i < length; i++) { // TEST
        FontViewer.showGlyph(glyphs[i]);
      }
    },

    showGlyph: function(glyph) {
      var container = document.createElement('div');
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");

      var line = glyph.getAttribute('d'), glyphName, horizAdvance = parseFloat(glyph.getAttribute('horiz-adv-x')), bbox, max;
      if(!line) return;
      
      bbox = FontViewer.getPathBoundingBox(line);
      max = Math.max(bbox.height, bbox.width);
      FontViewer.bbox = bbox;

      path.setAttribute('d', line);
      path.setAttribute('stroke', 'black');
      path.setAttribute('transform', 'scale('+(FontViewer.settings.glyphSize.width/max)+', -'+Math.abs(FontViewer.settings.glyphSize.width/max)+') '+
                                     'translate('+(0-bbox.x.min)+', -'+Math.abs(0-bbox.y.min-bbox.height)+')');

      svg.appendChild(path);
      svg.setAttribute('width', FontViewer.settings.glyphSize.width+'px');
      svg.setAttribute('height', FontViewer.settings.glyphSize.height+'px');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      glyphName = String(glyph.getAttribute('glyph-name'));
      FontViewer.glyphs[glyphName] = {name: glyphName, path: line, hoz: horizAdvance};

      container.className = 'fontViewer_'+glyphName;
      if(glyphName.length > 12) {
        glyphName = glyphName.substring(0, 9) + '...';
      }

      container.innerHTML = '<span>'+glyphName+"</span>";
      container.appendChild(svg);

      container.addEventListener('click', function() {
        FontViewer.modalGlyph(this.className.split('fontViewer_')[1]);
      }, false);

      $('glyphs').appendChild(container);

    },

    modalGlyph: function(glyphName) {
      console && console.log("Modal show: ", glyphName);
      var glyph = FontViewer.glyphs[glyphName];
      if(!glyph) {
        return false;
      }
      
      function correctPositions() {
        modalBackground.style.top = window.pageYOffset + 'px';

        modal.style.left = window.innerWidth/2 - FontViewer.settings.modalSize.width/2 + 'px';
        modal.style.top = window.pageYOffset + 30 + 'px';
      }

      var modal = $('modal'), modalBackground = $('modalBackground'), bbox = FontViewer.getPathBoundingBox(glyph.path), max;
      max = Math.max(bbox.height, bbox.width);
      modal.innerHTML = '<h2 id="modalGlyphName"></h2>';

      modalBackground.style.display = 'block';
      modalBackground.addEventListener('click', function() {
        this.style.display = 'none';
        modal.style.display = 'none';

        window.removeEventListener('scroll', correctPositions, false);
      }, false);

      window.addEventListener('scroll', correctPositions, false);

      $('modalGlyphName').innerHTML = glyph.name;
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      svg.setAttribute('width', FontViewer.settings.modalSize.width+'px');
      svg.setAttribute('height', FontViewer.settings.modalSize.height+'px');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      path.setAttribute('d', glyph.path);
      path.setAttribute('stroke', 'black');
      path.setAttribute('transform', 'scale('+(FontViewer.settings.modalSize.width/max)+', -'+Math.abs(FontViewer.settings.modalSize.width/max)+') '+
          'translate('+(0-bbox.x.min)+', -'+Math.abs(0-bbox.y.min-bbox.height)+')');

      svg.appendChild(path);
      modal.appendChild(svg);

      correctPositions();
      modal.style.display = 'block';
    },

    getPathBoundingBox: function(path) {
      var position = {x: null, y: null, beginX: null, beginY: null}, bbox = {x: {max: null, min: null}, y: {max: null, min: null}}, bit, arrayPath = [];
      path = path.split(/([mlthvzcsqa]|\s)/ig);

      // Clean up
      for(var i = 0, length = path.length; i < length; i++) {
        bit = path[i].trim();
        if(bit === '') continue;

        arrayPath.push(bit);
      }

      path = arrayPath;
      for(i = 0, length = path.length; i < length; i++) {
        bit = path[i].trim();

        switch(bit) {
        case 'M': {

          position.x = parseFloat(path[++i]);
          position.y = parseFloat(path[++i]);
          if(i === 2) { // Begin
            position.beginX = parseFloat(path[i-1]);
            position.beginY = parseFloat(path[i]);
          }
        } break;


        case 'L': 
        case 'T': {
          position.x = parseFloat(path[++i]);
          position.y = parseFloat(path[++i]);
        } break;
        
        case 'm':
        case 'l': 
        case 't': {
          position.x += parseFloat(path[++i]);
          position.y += parseFloat(path[++i]);
        } break;

        case 'H': {
          position.x = parseFloat(path[++i]);
        } break;

        case 'h': {
          position.x += parseFloat(path[++i]);
        } break;

        case 'V': {
          position.y = parseFloat(path[++i]);
        } break;

        case 'v': {
          position.y += parseFloat(path[++i]);
        } break;

        case 'z': 
        case 'Z': {
          position.x = position.beginX;
          position.y = position.beginY;
        } break;

        case 'C': {
          i = i + 4;
          position.x = parseFloat(path[++i]);
          position.y = parseFloat(path[++i]);
        } break;

        case 'c': {
          i = i + 4;
          position.x += parseFloat(path[++i]);
          position.y += parseFloat(path[++i]);
        } break;

        case 'S': 
        case 'Q': {
          i = i + 2;
          position.x = parseFloat(path[++i]);
          position.y = parseFloat(path[++i]);
        } break;

        case 's': 
        case 'q': {
          i = i + 2;
          position.x += parseFloat(path[++i]);
          position.y += parseFloat(path[++i]);
        } break;

        default: {
          console.log("WHAT:", bit);
        }
        }

        bbox.x.min = (position.x < bbox.x.min) ? position.x : bbox.x.min;
        bbox.x.max = (position.x > bbox.x.max) ? position.x : bbox.x.max;
        bbox.y.min = (position.y < bbox.y.min) ? position.y : bbox.y.min;
        bbox.y.max = (position.y > bbox.y.max) ? position.y : bbox.y.max;
      }

      bbox.x.min = Math.round(bbox.x.min*100)/100;
      bbox.x.max = Math.round(bbox.x.max*100)/100;
      bbox.y.min = Math.round(bbox.y.min*100)/100;
      bbox.y.max = Math.round(bbox.y.max*100)/100;
      bbox.width = bbox.x.max - bbox.x.min;
      bbox.height = bbox.y.max - bbox.y.min;
      return bbox;
    },

    glyphs: {},
    settings: {
      glyphSize: {
        width: 100,
        height: 100
      },

      modalSize: {
        width: 500,
        height: 500
      }
    }
};


window.addEventListener('load', function() {
  if(window.FileReader && (window.DOMParser || (typeof ActiveXObject !== 'undefined' && (new ActiveXObject("Microsoft.XMLDOM")) !== null))) {
    $('fontfileinput').addEventListener('change', FontViewer.handleFiles, false);
  } else {
    FontViewer.information("I'm sorry, but your browser must support the FileReader and DOMParser APIs. You should try Mozilla Firefox or Google Chrome!", true);
  }
}, false);

})();