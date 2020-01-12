if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

if (!Array.prototype.forEach) {

  Array.prototype.forEach = function(callback/*, thisArg*/) {

    var T, k;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    // 1. Let O be the result of calling toObject() passing the
    // |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get() internal
    // method of O with the argument "length".
    // 3. Let len be toUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If isCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }

    // 5. If thisArg was supplied, let T be thisArg; else let
    // T be undefined.
    if (arguments.length > 1) {
      T = arguments[1];
    }

    // 6. Let k be 0.
    k = 0;

    // 7. Repeat while k < len.
    while (k < len) {

      var kValue;

      // a. Let Pk be ToString(k).
      //    This is implicit for LHS operands of the in operator.
      // b. Let kPresent be the result of calling the HasProperty
      //    internal method of O with argument Pk.
      //    This step can be combined with c.
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal
        // method of O with argument Pk.
        kValue = O[k];

        // ii. Call the Call internal method of callback with T as
        // the this value and argument list containing kValue, k, and O.
        callback.call(T, kValue, k, O);
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined.
  };
}

function toArray(obj) {
  var array = [];
  // iterate backwards ensuring that length is an UInt32
  for (var i = obj.length >>> 0; i--;) {
    array[i] = obj[i];
  }
  return array;
}

function addClass (object, className) {
  object.classList ? object.classList.add(className) : object.className += ' ' + className;
}

function removeAllClassesButFirst (component, skipClass) {
  var classList = component.classList;
  var componentClass = classList.item(0);
  var toRemove = [];
  var beforeComponent = true;
  toArray(classList).forEach(function(className) {
    beforeComponent = beforeComponent && className != 'component'
    if (className != skipClass && className != componentClass && className != 'component' && !beforeComponent) {
      toRemove.push(className);
    }
  });
  toRemove.forEach(function(className) {
    classList.remove(className);
  });
}

function applyState (component, stateClass) {
  var componentClass = component.classList.item(0);
  component.className = componentClass;
  component.classList.add(stateClass);
}

function isCurrentState (component, state) {
  var classList = component.classList;
  var rv = false;
  toArray(classList).forEach(function (className) {
    if (className.endsWith(state)) {
      rv = true;
    }
  })
  return rv;
}

function whichTransitionEvent(){
  var t,
      el = document.createElement("fakeelement");

  var transitions = {
    "transition"      : "transitionend",
    "OTransition"     : "oTransitionEnd",
    "MozTransition"   : "transitionend",
    "WebkitTransition": "webkitTransitionEnd"
  }

  for (t in transitions){
    if (el.style[t] !== undefined){
      return transitions[t];
    }
  }
}


var transitionEvent = whichTransitionEvent();

// Javascript for component WaveMoving
// Longest animation for Transition 1 is this;group61;line13
// Transition 1: From keyframe1 to keyframe2

function clickWaveMoving1Handler(event) {
  var component = document.querySelector('.wavemoving');
  if (isCurrentState(component, 'keyframe1')) {
    try {
    //  console.log('Listener for event: click triggered. State: keyframe1');
      setTimeout(function() {
        var component = document.querySelector('.wavemoving');
        component.addEventListener(transitionEvent, transitionWaveMovingkeyframe1tokeyframe2EndedHandler);
        removeAllClassesButFirst(component, 'keyframe1-to-keyframe2');
        addClass(component, 'keyframe2');
        addClass(component, 'keyframe1-to-keyframe2');
      }, 0);
    }
    catch (e) {
      console.log(e)
    }
  }
}

function transitionWaveMovingkeyframe1tokeyframe2EndedHandler(event) {
  
  if (event.target.className.trim() == 'line13' ||
      event.target.className.startsWith('line13 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe1tokeyframe2EndedHandler);
    //console.log('transitionWaveMovingkeyframe1tokeyframe2EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe2tokeyframe3EndedHandler);
      removeAllClassesButFirst(component, 'keyframe2-to-keyframe3');
      addClass(component, 'keyframe3');
      addClass(component, 'keyframe2-to-keyframe3');
    }, 0);
  }
}



// Transition WaveMoving keyframe1-to-keyframe2 Event Listeners
    // click keyframe1 keyframe1
var component = document.querySelector('.wavemoving');
component.addEventListener('click', clickWaveMoving1Handler);

function resetWaveMoving() {
    //console.log('reset');
    var component = document.querySelector('.wavemoving');
    if (!component) { return; }
    component.addEventListener(transitionEvent, transitionWaveMovingkeyframe1tokeyframe2EndedHandler);

    removeAllClassesButFirst(component, 'keyframe1-to-keyframe2');
    addClass(component, 'keyframe2');
    addClass(component, 'keyframe1-to-keyframe2');
}



// Javascript for component WaveMoving
// Longest animation for Transition 2 is this;group61;line23
// Transition 2: From keyframe2 to keyframe3


function transitionWaveMovingkeyframe2tokeyframe3EndedHandler(event) {
  
  if (event.target.className.trim() == 'line23' ||
      event.target.className.startsWith('line23 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe2tokeyframe3EndedHandler);
    //console.log('transitionWaveMovingkeyframe2tokeyframe3EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe3tokeyframe4EndedHandler);
      removeAllClassesButFirst(component, 'keyframe3-to-keyframe4');
      addClass(component, 'keyframe4');
      addClass(component, 'keyframe3-to-keyframe4');
    }, 0);
  }
}



// Transition WaveMoving keyframe2-to-keyframe3 Event Listeners
    // animationend keyframe2 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 3 is this;group6;line1
// Transition 3: From keyframe3 to keyframe4


function transitionWaveMovingkeyframe3tokeyframe4EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe3tokeyframe4EndedHandler);
    //console.log('transitionWaveMovingkeyframe3tokeyframe4EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe4tokeyframe5EndedHandler);
      removeAllClassesButFirst(component, 'keyframe4-to-keyframe5');
      addClass(component, 'keyframe5');
      addClass(component, 'keyframe4-to-keyframe5');
    }, 0);
  }
}



// Transition WaveMoving keyframe3-to-keyframe4 Event Listeners
    // animationend keyframe3 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 4 is this;group61;line17
// Transition 4: From keyframe4 to keyframe5


function transitionWaveMovingkeyframe4tokeyframe5EndedHandler(event) {
  
  if (event.target.className.trim() == 'line17' ||
      event.target.className.startsWith('line17 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe4tokeyframe5EndedHandler);
    //console.log('transitionWaveMovingkeyframe4tokeyframe5EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe5tokeyframe6EndedHandler);
      removeAllClassesButFirst(component, 'keyframe5-to-keyframe6');
      addClass(component, 'keyframe6');
      addClass(component, 'keyframe5-to-keyframe6');
    }, 0);
  }
}



// Transition WaveMoving keyframe4-to-keyframe5 Event Listeners
    // animationend keyframe4 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 5 is this;group6;line4
// Transition 5: From keyframe5 to keyframe6


function transitionWaveMovingkeyframe5tokeyframe6EndedHandler(event) {
  
  if (event.target.className.trim() == 'line4' ||
      event.target.className.startsWith('line4 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe5tokeyframe6EndedHandler);
    //console.log('transitionWaveMovingkeyframe5tokeyframe6EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe6tokeyframe7EndedHandler);
      removeAllClassesButFirst(component, 'keyframe6-to-keyframe7');
      addClass(component, 'keyframe7');
      addClass(component, 'keyframe6-to-keyframe7');
    }, 0);
  }
}



// Transition WaveMoving keyframe5-to-keyframe6 Event Listeners
    // animationend keyframe5 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 6 is this;group6;line1
// Transition 6: From keyframe6 to keyframe7


function transitionWaveMovingkeyframe6tokeyframe7EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe6tokeyframe7EndedHandler);
    //console.log('transitionWaveMovingkeyframe6tokeyframe7EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe7tokeyframe8EndedHandler);
      removeAllClassesButFirst(component, 'keyframe7-to-keyframe8');
      addClass(component, 'keyframe8');
      addClass(component, 'keyframe7-to-keyframe8');
    }, 0);
  }
}



// Transition WaveMoving keyframe6-to-keyframe7 Event Listeners
    // animationend keyframe6 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 7 is this;group6;line1
// Transition 7: From keyframe7 to keyframe8


function transitionWaveMovingkeyframe7tokeyframe8EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe7tokeyframe8EndedHandler);
    //console.log('transitionWaveMovingkeyframe7tokeyframe8EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe8tokeyframe9EndedHandler);
      removeAllClassesButFirst(component, 'keyframe8-to-keyframe9');
      addClass(component, 'keyframe9');
      addClass(component, 'keyframe8-to-keyframe9');
    }, 0);
  }
}



// Transition WaveMoving keyframe7-to-keyframe8 Event Listeners
    // animationend keyframe7 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 8 is this;group6;line1
// Transition 8: From keyframe8 to keyframe9


function transitionWaveMovingkeyframe8tokeyframe9EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe8tokeyframe9EndedHandler);
    //console.log('transitionWaveMovingkeyframe8tokeyframe9EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe9tokeyframe10EndedHandler);
      removeAllClassesButFirst(component, 'keyframe9-to-keyframe10');
      addClass(component, 'keyframe10');
      addClass(component, 'keyframe9-to-keyframe10');
    }, 0);
  }
}



// Transition WaveMoving keyframe8-to-keyframe9 Event Listeners
    // animationend keyframe8 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 9 is this;group6;line1
// Transition 9: From keyframe9 to keyframe10


function transitionWaveMovingkeyframe9tokeyframe10EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe9tokeyframe10EndedHandler);
    //console.log('transitionWaveMovingkeyframe9tokeyframe10EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe10tokeyframe11EndedHandler);
      removeAllClassesButFirst(component, 'keyframe10-to-keyframe11');
      addClass(component, 'keyframe11');
      addClass(component, 'keyframe10-to-keyframe11');
    }, 0);
  }
}



// Transition WaveMoving keyframe9-to-keyframe10 Event Listeners
    // animationend keyframe9 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 10 is this;group6;line1
// Transition 10: From keyframe10 to keyframe11


function transitionWaveMovingkeyframe10tokeyframe11EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe10tokeyframe11EndedHandler);
    //console.log('transitionWaveMovingkeyframe10tokeyframe11EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe11tokeyframe12EndedHandler);
      removeAllClassesButFirst(component, 'keyframe11-to-keyframe12');
      addClass(component, 'keyframe12');
      addClass(component, 'keyframe11-to-keyframe12');
    }, 0);
  }
}



// Transition WaveMoving keyframe10-to-keyframe11 Event Listeners
    // animationend keyframe10 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 11 is this;group6;line1
// Transition 11: From keyframe11 to keyframe12


function transitionWaveMovingkeyframe11tokeyframe12EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe11tokeyframe12EndedHandler);
    //console.log('transitionWaveMovingkeyframe11tokeyframe12EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe12tokeyframe13EndedHandler);
      removeAllClassesButFirst(component, 'keyframe12-to-keyframe13');
      addClass(component, 'keyframe13');
      addClass(component, 'keyframe12-to-keyframe13');
    }, 0);
  }
}



// Transition WaveMoving keyframe11-to-keyframe12 Event Listeners
    // animationend keyframe11 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 12 is this;group6;line8
// Transition 12: From keyframe12 to keyframe13


function transitionWaveMovingkeyframe12tokeyframe13EndedHandler(event) {
  
  if (event.target.className.trim() == 'line8' ||
      event.target.className.startsWith('line8 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe12tokeyframe13EndedHandler);
    //console.log('transitionWaveMovingkeyframe12tokeyframe13EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe13tokeyframe14EndedHandler);
      removeAllClassesButFirst(component, 'keyframe13-to-keyframe14');
      addClass(component, 'keyframe14');
      addClass(component, 'keyframe13-to-keyframe14');
    }, 0);
  }
}



// Transition WaveMoving keyframe12-to-keyframe13 Event Listeners
    // animationend keyframe12 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 13 is this;group6;line1
// Transition 13: From keyframe13 to keyframe14


function transitionWaveMovingkeyframe13tokeyframe14EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe13tokeyframe14EndedHandler);
    //console.log('transitionWaveMovingkeyframe13tokeyframe14EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe14tokeyframe15EndedHandler);
      removeAllClassesButFirst(component, 'keyframe14-to-keyframe15');
      addClass(component, 'keyframe15');
      addClass(component, 'keyframe14-to-keyframe15');
    }, 0);
  }
}



// Transition WaveMoving keyframe13-to-keyframe14 Event Listeners
    // animationend keyframe13 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 14 is this;group6;line1
// Transition 14: From keyframe14 to keyframe15


function transitionWaveMovingkeyframe14tokeyframe15EndedHandler(event) {
  
  if (event.target.className.trim() == 'line1' ||
      event.target.className.startsWith('line1 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe14tokeyframe15EndedHandler);
    //console.log('transitionWaveMovingkeyframe14tokeyframe15EndedHandler()');
    // animationend
    setTimeout(function () {
      var component = document.querySelector('.wavemoving');
      component.addEventListener(transitionEvent, transitionWaveMovingkeyframe15tokeyframe16EndedHandler);
      removeAllClassesButFirst(component, 'keyframe15-to-keyframe16');
      addClass(component, 'keyframe16');
      addClass(component, 'keyframe15-to-keyframe16');
    }, 0);
  }
}



// Transition WaveMoving keyframe14-to-keyframe15 Event Listeners
    // animationend keyframe14 keyframe1

// Javascript for component WaveMoving
// Longest animation for Transition 15 is this;group6;lineCopy2
// Transition 15: From keyframe15 to keyframe16


function transitionWaveMovingkeyframe15tokeyframe16EndedHandler(event) {
  
  if (event.target.className.trim() == 'linecopy2' ||
      event.target.className.startsWith('linecopy2 ')) {
    var component = document.querySelector('.wavemoving');
    component.removeEventListener(transitionEvent, transitionWaveMovingkeyframe15tokeyframe16EndedHandler);
    //console.log('transitionWaveMovingkeyframe15tokeyframe16EndedHandler()');
    lastTransitionWaveMovingEndedHandler(event);
  }
}


function lastTransitionWaveMovingEndedHandler(event) {
  //console.log('lastTransitionWaveMovingEndedHandler()');
  var component = document.querySelector('.wavemoving');
  removeAllClassesButFirst(component, 'keyframe1');
  addClass(component, 'keyframe1');
  var event = new Event('click');
  setTimeout(function() {
    component.dispatchEvent(event);
  }, 0);
}


// Transition WaveMoving keyframe15-to-keyframe16 Event Listeners
    // animationend keyframe15 keyframe1


// Start first animation transition of wavemoving
(function() {
    var component = document.querySelector('.wavemoving');
    var event = new Event('click');
    component.dispatchEvent(event);
})();