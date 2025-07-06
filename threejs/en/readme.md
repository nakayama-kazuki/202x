# How to Handle Challenges in Three.js App Development

[<a href='https://github.com/nakayama-kazuki/202x/tree/main/threejs'>Japanese article</a>]

Hello, my name is pj-corridor, previously an advertising engineer and currently a data platform engineer. In this article, I will share insights gained through my hobby of developing Three.js applications, such as common pitfalls for beginners, browser compatibility issues, and their solutions. BTW, I would like to express my gratitude to TECHSCORE BLOG for kindly allowing me to publish this article, as we have collaborated before at SynergyMarketing. Thank you very much !

Let\'s start by introducing the Three.js applications.

### A New Concept for Reversi

<img width='300' src='https://pj-corridor.net/images/ix-side6-reversi-4-loop.png' />

You might wonder, Is Three.js necessary for Reversi ? But with a 3D board that loops in a cylindrical shape, you can enjoy strategies that were not possible before. Additionally, the introduction of the DMZ area and a variety of NPC options (1 to 3) are available. In the case of the loop board, you can also opt for rotation tactics. The rule-based NPC implementation (as of June 2025) might feel lacking in one-on-one battles, but even experienced players will find the chaotic four-player matches (NPC x3 + human) challenging. Feel free to try it while waiting for the train.

- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-non-loop'>2-Player (NPC x1 + Human) Standard Board Reversi</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=2-loop'>2-Player (NPC x1 + Human) Loop Board Reversi</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-non-loop'>4-Player (NPC x3 + Human) Standard Board Reversi</a>
- <a href='https://pj-corridor.net/side-six/side-six-reversi.html?type=4-loop'>4-Player (NPC x3 + Human) Loop Board Reversi</a>

### Diverse Puzzles

<img width='300' src='https://pj-corridor.net/images/ix-cube1.png' />

I developed various puzzles by expanding on the classic Three.js study subject, the Rubik\'s Cube. However, compared to <a href='https://www.youtube.com/@Z3Cubing'>Z3Cubing</a>, there\'s not enough. In the future, I aim to explore directions that cannot be realized with physical gadgets (such as <a href='https://pj-corridor.net/cube3d/caterpillar.html'>Cube with Anomalous Rotations</a>).

- <a href='https://pj-corridor.net/cube3d/cube3d.html'>Standard Rubik\'s Cube</a>
- <a href='https://pj-corridor.net/cube3d/cube3d.html?level=3'>Cube with Anomalous Piece Shapes</a>
- <a href='https://pj-corridor.net/cube3d/caterpillar.html'>Cube with Anomalous Rotations</a>
- <a href='https://pj-corridor.net/cube3d/diamond.html'>Diamond-Shaped Puzzle</a>
- <a href='https://pj-corridor.net/cube3d/gemini.html'>Twin Cube</a>
- <a href='https://pj-corridor.net/side-six/side-six.htmll'>Cylinder-Shaped Puzzle</a>

### Stick Figures

<img width='300' src='https://pj-corridor.net/images/ix-figure.png' />

I often create PowerPoint slides using a lot of simple illustration (<a href='https://lydesign.jp/n/n3aa55611b347'>This is a blog article</a> written in Japanese about simple illustration), but finding copyright-free stick figure materials to paste on slides can be a hassle. So, I decided to develop my own. Feel free to use them in your slides as well.

- <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>Stick Figure (Joint Operation Posing)</a>
- <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>Rubber Figure (Bend and Stretch Posing)</a>
- <a href='https://pj-corridor.net/stick-figure/hand.html'>Hand (Bend and Stretch Posing)</a>

### Stick Figure Gallery

<img width='300' src='https://pj-corridor.net/images/figure-gallery.png' />

While the stick figures solved the issue of finding materials, even posing them became cumbersome :-p. So, I prepared structured pose data input/output and a gallery. You can find something close to your image and make slight adjustments to obtain the desired stick figure material.

- <a href='https://pj-corridor.net/stick-figure/gallery/index.html'>Stick Figure Gallery</a>

As the next step, I\'m envisioning a stick figure that generates appropriate poses from natural language (e.g., words expressing emotions or postures) using machine learning by labeling pose data.

Now, let\'s delve into the insights gained through Three.js app development.

## The Empty Draw Buffer

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/screenshot.gif' />

In <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>Stick Figure</a>, <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>Rubber Figure</a>, and <a href='https://pj-corridor.net/stick-figure/hand.html'>Hand</a>, I implemented a screenshot feature that copies the image of the determined pose to the clipboard. This feature uses `toDataURL()` on `WebGLRenderer.domElement` (<a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.domElement'>reference</a>), but initially, I struggled to capture the rendered image.

For example, in the following code :

```
const w = 400;
const h = 400;

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h);

const camera = new THREE.PerspectiveCamera(45, w / h);
camera.position.set(0, 0, +1000);

const scene = new THREE.Scene();
const geometry = new THREE.BoxGeometry(50, 50, 50);
const material = new THREE.MeshNormalMaterial();
const box = new THREE.Mesh(geometry, material);
scene.add(box);

renderer.render(scene, camera);

// (1)
console.log(renderer.domElement.toDataURL('image/png'));

setTimeout(() => {
    // (2)
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);

button.addEventListener('click', in_ev => {
    // (3)
    console.log(renderer.domElement.toDataURL('image/png'));
});

```

At the timing of (1), `toDataURL()` provides the expected output, but at (2) and (3), it doesn\'t work. This is because the `WebGLRenderer` automatically clears the draw buffer after rendering each frame. By trying to set `WebGLRenderer.preserveDrawingBuffer` (<a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.preserveDrawingBuffer'>reference</a>) to retain the draw buffer :

```
const renderer = new THREE.WebGLRenderer({preserveDrawingBuffer : true});
```

You can obtain the expected output even at the asynchronous timings of (2) and (3). However, according to the <a href='https://registry.khronos.org/webgl/specs/latest/1.0/'>WebGL Specification</a> :

> While it is sometimes desirable to preserve the drawing buffer, it can cause significant performance loss on some platforms. Whenever possible this flag should remain false and other techniques used.

Given the non-normative note and past related bugs reported in WebKit, I decided not to change the default `false` for the drawing buffer setting and instead re-render just before `toDataURL()`.

```
setTimeout(() => {
    // (2)
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
}, 0);

button.addEventListener('click', in_ev => {
    // (3)
    renderer.render(scene, camera);
    console.log(renderer.domElement.toDataURL('image/png'));
});
```

This way, I successfully implemented the screenshot feature. Please try pasting it into PowerPoint slides.

## Three Three.js Raycasting Traps

In Three.js applications, <a href='https://threejs.org/docs/#api/en/core/Raycaster'>raycasting</a> is used to determine the intersection between the coordinates where touch or mouse events occur and objects.

> Raycasting is used for mouse picking (working out what objects in the 3d space the mouse is over) amongst other things.

Here, I will introduce three traps (or failures) related to raycasting.

### 1. Intrusive AxesHelper

In <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>Stick Figure</a> and <a href='https://pj-corridor.net/cube3d/cube3d.html'>Rubik\'s Cube</a>, raycasting from the coordinates where `touchstart` or `mousedown` events occur is used to determine if :

1. There is an intersection with an object in the scene :
   - Drag the intersecting part
   - Use `touchmove` or `mousemove` to manipulate the part (e.g., change the pose)
2. There is no intersection with an object in the scene :
   - Drag from that coordinate
   - Use `touchmove` or `mousemove` to rotate the object (actually, the object itself does not rotate; the `PerspectiveCamera`, which continuously look at the object, moves in the opposite direction of the `touchmove` or `mousemove` events)

This is the common UX. However, when I added an `AxesHelper` (three-colored lines representing axes) to the scene for debugging purposes, it sometimes behaved strangely.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/AxesHelper.png' />

The reason was that `AxesHelper` itself was a target for `Raycaster.intersectObject()` (<a href='https://threejs.org/docs/#api/en/core/Raycaster.intersectObject'>reference</a>). To address this, either consider intersections with it or exclude its influence before checking intersections, as shown below.

```
const children = scene.children.filter(in_child => !(in_child instanceof THREE.AxesHelper));
const intersects = raycaster.intersectObjects(children);
```

### 2. Ghost CircleGeometry

In <a href='https://pj-corridor.net/stick-figure/stick-figure.html'>Stick Figure</a>, part manipulation works as follows :

1. Add an operation object to the scene when a part is dragged :
   - `SphereGeometry` with the same radius as the height of the target part
   - `CircleGeometry` that passes through the center of the `SphereGeometry` with its normal vector facing the `PerspectiveCamera`
2. Use raycasting from the coordinates where `touchmove` or `mousemove` events occur to determine the intersection direction with the operation object, and have the dragged part `lookAt()` (<a href='https://threejs.org/docs/#api/en/core/Object3D.lookAt'>reference</a>) it

Here\'s a demonstration with the operation object colored for debugging, showing how the stick figure\'s hand moves.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/CircleGeometry.gif' />

Sometimes, raycasting occurs from the opposite direction of the object in 3d space, and in that situation, it behaves strangely. I found that `SphereGeometry` does not intersect with raycasting from the back. Since `CircleGeometry` always faces the `PerspectiveCamera`, this was a blind spot ! ^^;

In this case, you can use a material for both sides, for example :

```
const geometry = new THREE.CircleGeometry(100, 32);
const material = new THREE.MeshNormalMaterial({side : THREE.DoubleSide});
const circle = new THREE.Mesh(geometry, material);
```

### 3. Why Do Bent SkinnedMeshes Lack Vertices ?

In <a href='https://pj-corridor.net/stick-figure/rubber-figure.html'>Rubber Figure</a> and <a href='https://pj-corridor.net/stick-figure/hand.html'>Hand</a>, `SkinnedMesh` is used to smoothly bend parts. So far, so good, but the problem was that bent parts did not intersect with raycasting. While there was no information about this in the <a href='https://threejs.org/docs/#api/en/objects/SkinnedMesh'>documentation</a>, I wondered why.

After researching forums and the <a href='https://github.com/mrdoob/three.js/blob/master/src/objects/SkinnedMesh.js'>implementation</a>, I understood that the actual vertex data is not changed, and the influence of bones is calculated and drawn. So, I created an `ExtrudeGeometry`  (<a href='https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry'>reference</a>) using `SkinnedMesh.skeleton.bones` as rough alternative vertex data, and by dragging the intersection with raycasting, I was able to manipulate the rubber figure.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/rubber-figure.gif' />

## Browser Compatibility Issues with AdSense

Once the Three.js app was taking shape, I decided to try implementing AdSense. However, I encountered unexpected hurdles in coexisting Three.js apps with AdSense. Here, I will share the journey of resolving browser compatibility issues related to iframes.

During initialization and window resizing, Three.js apps require appropriate coordinate processing and settings changes for rendering :

- Change `PerspectiveCamera.aspect` (<a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.aspect'>reference</a>)
- Call `PerspectiveCamera.updateProjectionMatrix()` (<a href='https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.updateProjectionMatrix'>reference</a>)
- Call `WebGLRenderer.setSize()` (<a href='https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setSize'>reference</a>)

Additionally, since <a href='https://support.google.com/adsense/answer/9190028'>AdSense code</a> may automatically insert ads, potentially changing the size of other elements, similar processing is needed at that timing. For example, the `offsetHeight` of elements is changed.

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/adsense.gif' />

However, since there are writes to the `width` and `height` of `WebGLRenderer.domElement` in the <a href='https://github.com/mrdoob/three.js/blob/master/src/renderers/WebGLRenderer.js'>implementation</a>, calling it within the callback of `ResizeObserver` feels a bit risky (incidentally, in the <a href='https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/resize_observer/resize_observer.cc'>Chromium implementation</a>, it checks for changes in element size from the previous observation, so it doesn\'t fall into an infinite loop).

Therefore, by placing `WebGLRenderer.domElement` inside an `iframe` :

1. Automatic ad insertion by AdSense
2. Resizing of the `iframe` due to the above
3. Event handler processing due to the above
   - Resize `width` and `height` of `WebGLRenderer.domElement`
   - Change settings for coordinate processing and rendering

I considered addressing it like this.

```
function createOuterWindow(in_document) {
    const iframe = in_document.createElement('iframe');
    Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none'
    });
    in_document.body.appendChild(iframe);
    return iframe.contentWindow;
}

const outerWin = createOuterWindow(document);
const outerDoc = outerWin.document;

// myCanvas : WebGLRenderer.domElement
outerDoc.body.appendChild(myCanvas);

outerWin.addEventListener('resize', in_event => {
    // maintain PerspectiveCamera.aspect etc
    console.log('resized');
});
```

However, while it worked as expected in Chrome (137.0), `WebGLRenderer.domElement` did not display in Firefox (139.0). So, I tried changing the processing timing. According to the <a href='https://html.spec.whatwg.org/#the-iframe-element'>specification</a> of `iframe`, `iframe` without `src` or `srcdoc` attributes load `about:blank` as a default, so :

> 3. If url matches about:blank and initialInsertion is true, then: Run the iframe load event steps given element.

How about this timing ?

```
const outerWin = createOuterWindow(document);

outerWin.addEventListener('load', () => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
});
```

This time, it worked as expected in Firefox, but the event did not execute in Chrome. Related discussions can be found in <a href='https://github.com/whatwg/html/issues/6863'>stop triggering navigations to about:blank on iframe insertion</a>, but by delaying the processing to the next event loop, I achieved the expected behavior in both browsers, so I decided to leave it at that for now and document it.

```
const outerWin = createOuterWindow(document);

// asynchronous process for Firefox
setTimeout(() => {
    const outerDoc = outerWin.document;

    // myCanvas : WebGLRenderer.domElement
    outerDoc.body.appendChild(myCanvas);
}, 0);
```

With this, I finally managed to keep up with automatic ad insertion for coordinate processing and rendering settings changes.

## My Super Special Duper Animation Function

Now that AdSense implementation is settled, I want to brush up on the overall UX. In my Three.js apps, `WebGLRenderer` rendering adopts animation expressions overall, but I want to adopt similar UX for rendering regular HTML elements (such as dialog displays) as well. However, I don\'t want to disperse animation-related descriptions like CSS `@keyframes` definitions. Here\'s an implementation I came up with to manage it simply and centrally with JavaScript code only.

```
function autoTransition1(in_elem, in_shorthand, in_start, in_end) {
    return new Promise(in_resolve => {
        let [prop,,, delay = '0s'] = in_shorthand.split(/\s+/);
        // convert from CSS to CSSOM
        prop = prop.replace(/-([a-z])/g, (in_match, in_letter) => in_letter.toUpperCase());
        delay = delay.includes('ms') ? parseFloat(delay) : parseFloat(delay) * 1000;
        in_elem.style['transition'] = in_shorthand;
        in_elem.style[prop] = in_start;
        // automatically start the transition in the next event loop
        setTimeout(() => in_elem.style[prop] = in_end, delay);
        const callback = in_ev => {
            if (in_ev.propertyName === prop) {
                in_elem.removeEventListener('transitionend', callback);
                (in_resolve)();
            }
        };
        in_elem.addEventListener('transitionend', callback);
    });
}

function autoTransition2(in_elem, in_shorthand, in_start, in_end) {
    (async () => await autoTransition1(in_elem, in_shorthand, in_start, in_end))();
}

autoTransition2(element, 'color 1.5s ease-out', 'blue', 'white');
```

By specifying the shorthand of CSS Transitions and the start and end values of transition-property, you can execute animations related to elements.

<img  width='300' src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/threejs/img/dialog.gif' />

## Conclusion

Thank you for reading this far. Although I didn\'t create headings for them, there were various minor failures as well. For example, many classes in Three.js have a `clone()` method implemented, but when I implemented a new class by inheriting a class, I struggled with suspicious behavior of cloned instances due to changing the constructor\'s interface, which is quite embarrassing.

I hope that the insights (or failures ?) I gained through Three.js app development will be useful information for you.
