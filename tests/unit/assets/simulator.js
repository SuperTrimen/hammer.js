(function() {
    var Simulator = {
        type: 'touch',

        /**
         * set type
         * @param type
         */
        setType: function(type) {
            if(!Simulator.events[type]) {
                throw new Error(type + " is not a valid event type.");
            }
            return this.type = type;
        }
    };

    // simple easing methods
    // found at the source of velocity.js
    Simulator.easings = {
        linear: function(p) { return p; },
        swing: function(p) { return 0.5 - Math.cos(p * Math.PI) / 2; },
        quad: function(p) { return Math.pow(p, 2); },
        cubic: function(p) { return Math.pow(p, 3); },
        quart: function(p) { return Math.pow(p, 4); },
        quint: function(p) { return Math.pow(p, 5); },
        expo: function(p) { return Math.pow(p, 6); }
    };

    Simulator.events = {
        /**
         * pointer events
         */
        pointer: {
            fakeSupport: function() {
                if(!("PointerEvent" in window)) {
                    navigator.maxTouchPoints = 10;
                    window.PointerEvent = function () {};
                }
            },

            typeMap: {
                start: 'pointerdown',
                move: 'pointermove',
                end: 'pointerup',
                cancel: 'pointercancel'
            },

            trigger: function(touches, element, type) {
                touches.forEach(function (touch, i) {
                    var x = Math.round(touch.x),
                        y = Math.round(touch.y);

                    var event = document.createEvent('Event');
                    event.initEvent(this.typeMap[type], true, true);

                    event.getCurrentPoint = function() { return touch; }
                    event.setPointerCapture = event.releasePointerCapture = function() { }

                    event.buttons = 1;
                    event.pageX = x;
                    event.pageY = y;
                    event.clientX = x;
                    event.clientY = y;
                    event.screenX = x;
                    event.screenY = y;
                    event.target = element;
                    event.identifier = i;

                    element.dispatchEvent(event);
                }, this);

                renderTouches(touches);
            }
        },

        /**
         * touch events
         */
        touch: {
            fakeSupport: function() {
                if(!("ontouchstart" in window)) {
                    window.ontouchstart = function () {};
                }
            },

            emptyTouchList: function() {
                var touchList = [];
                touchList.identifiedTouch = touchList.item = function(index) {
                    return this[index] || {};
                };
                return touchList;
            },

            trigger: function (touches, element, type) {
                var touchList = this.emptyTouchList();
                touches.forEach(function (touch, i) {
                    var x = Math.round(touch.x),
                        y = Math.round(touch.y);

                    touchList.push({
                        pageX: x,
                        pageY: y,
                        clientX: x,
                        clientY: y,
                        screenX: x,
                        screenY: y,
                        target: element,
                        identifier: i
                    });
                });

                var event = document.createEvent('Event');
                event.initEvent('touch' + type, true, true);
                event.touches = (type == 'end') ? this.emptyTouchList() : touchList;
                event.targetTouches = (type == 'end') ? this.emptyTouchList() : touchList;
                event.changedTouches = touchList;
                element.dispatchEvent(event);

                renderTouches(touches);
            }
        }
    };

    /**
     * merge objects
     * @param dest
     * @param src
     * @returns dest
     */
    function merge(dest, src) {
        dest = dest || {};
        src = src || {};
        for (var key in src) {
            if (src.hasOwnProperty(key) && dest[key] === undefined) {
                dest[key] = src[key];
            }
        }
        return dest;
    }

    /**
     * generate a list of x/y around the center
     * @param center
     * @param countTouches
     * @param [radius=100]
     * @param [rotation=0]
     */
    function getTouches(center, countTouches, radius, rotation) {
        var cx = center[0],
            cy = center[1],
            touches = [],
            slice, i, angle;

        // just one touch, at the center
        if (countTouches === 1) {
            return [{ x: cx, y: cy }];
        }

        radius = radius || 100;
        rotation = (rotation * Math.PI / 180) || 0;
        slice = 2 * Math.PI / countTouches;

        for (i = 0; i < countTouches; i++) {
            angle = (slice * i) + rotation;
            touches.push({
                x: (cx + radius * Math.cos(angle)),
                y: (cy + radius * Math.sin(angle))
            });
        }

        return touches;
    }

    /**
     * render the touches
     * @param touches
     * @param element
     * @param type
     */
    function renderTouches(touches) {
        touches.forEach(function(touch) {
            var el = document.createElement('div');
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.background = 'red';
            el.style.position = 'absolute';
            el.style.top = 0;
            el.style.left = 0;
            el.style.borderRadius = '100%';
            el.style.border = 'solid 2px #000';
            el.style.zIndex = 2000;

            el.style.transform = 'translate('+ touch.x +'px ,'+ touch.y +'px)';
            el.style.mozTransform = 'translate('+ touch.x +'px ,'+ touch.y +'px)';
            el.style.webkitTransform = 'translate('+ touch.x +'px ,'+ touch.y +'px)';

            document.body.appendChild(el);
            setTimeout(function() {
                document.body.removeChild(el);
                el = null;
            }, 100);
        });
    }

    /**
     * trigger the touch events
     * @param touches
     * @param element
     * @param type
     * @returns {*}
     */
    function trigger(touches, element, type) {
        return Simulator.events[Simulator.type].trigger(touches, element, type);
    }

    /**
     * trigger a gesture
     * @param element
     * @param startTouches
     * @param options
     * @param done
     */
    function triggerGesture(element, startTouches, options, done) {
        var interval = 10,
            loops = Math.ceil(options.duration / interval),
            loop = 1;

        options = merge(options, {
            pos: [10, 10],
            duration: 250,
            touches: 1,
            deltaX: 0,
            deltaY: 0,
            radius: 100,
            scale: 1,
            rotation: 0,
            easing: 'swing'
        });

        function gestureLoop() {
            // calculate the radius
            // this is for scaling and multiple touches
            var radius = options.radius;
            if (options.scale !== 1) {
                radius = options.radius - (options.radius * (1 - options.scale) * (1 / loops * loop));
            }

            // calculate new position/rotation
            var easing = Simulator.easings[options.easing](1 / loops * loop),
                posX = options.pos[0] + (options.deltaX / loops * loop) * easing,
                posY = options.pos[1] + (options.deltaY / loops * loop) * easing,
                rotation = options.rotation / loops * loop,
                touches = getTouches([posX, posY], startTouches.length, radius, rotation),
                isFirst = (loop == 1),
                isLast = (loop == loops);

            if (isFirst) {
                trigger(touches, element, 'start');
            } else if (isLast) {
                trigger(touches, element, 'end');
                return done();
            } else {
                trigger(touches, element, 'move');
            }

            setTimeout(gestureLoop, interval);
            loop++;
        }
        gestureLoop();
    }

    Simulator.gestures = {
        /**
         * press
         * @param element
         * @param options
         * @param done
         */
        press: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                duration: 500,
                touches: 1
            });

            var touches = getTouches(options.pos, 1);

            trigger(touches, element, 'start');
            setTimeout(function() {
                trigger(touches, element, 'end');
                setTimeout(done, 25);
            }, options.duration);
        },

        /**
         * tap
         * @param element
         * @param options
         * @param done
         */
        tap: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                duration: 100,
                touches: 1
            });

            var touches = getTouches(options.pos, 1);
            trigger(touches, element, 'start');
            setTimeout(function() {
                trigger(touches, element, 'end');
                setTimeout(done, 25);
            }, options.duration);
        },

        /**
         * double tap
         * @param element
         * @param options
         * @param done
         */
        doubleTap: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                pos2: [11, 11],
                duration: 100,
                interval: 200,
                touches: 1
            });

            gestures.tap(element, options, function() {
                setTimeout(function() {
                    options.pos = options.pos2;
                    gestures.tap(element, options, done);
                }, options.interval);
            });
        },

        /**
         * pan
         * @param element
         * @param options
         * @param done
         */
        pan: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                deltaX: 300,
                deltaY: 150,
                duration: 250,
                touches: 1
            });

            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        /**
         * swipe
         * @param element
         * @param options
         * @param done
         */
        swipe: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                deltaX: 300,
                deltaY: 150,
                duration: 250,
                touches: 1,
                easing: 'expo'
            });

            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        /**
         * pinch
         * @param element
         * @param options
         * @param done
         */
        pinch: function(element, options, done) {
            options = merge(options, {
                pos: [300, 300],
                scale: 2,
                duration: 250,
                radius: 100,
                touches: 2
            });

            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        /**
         * rotate
         * @param element
         * @param options
         * @param done
         */
        rotate: function(element, options, done) {
            options = merge(options, {
                pos: [300, 300],
                rotation: 180,
                duration: 250,
                touches: 2
            });

            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        /**
         * combination of pinch and rotate
         * @param element
         * @param options
         * @param done
         */
        pinchRotate: function(element, options, done) {
            options = merge(options, {
                pos: [300, 300],
                rotation: 180,
                radius: 100,
                scale: .5,
                duration: 250,
                touches: 2
            });

            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        }
    };

    window.Simulator = Simulator;
})();
