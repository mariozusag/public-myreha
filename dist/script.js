(() => {

    const sides_opposites = {
        left: 'right',
        right: 'left',
        top: 'bottom',
        bottom: 'top'
    };
    const sides_containers = {
        left: 'width',
        right: 'width',
        top: 'height',
        bottom: 'height'
    };
    const containers = ['height', 'width'];

    function normalize_to_percent_and_offset(value) {
        let percent = 0.0;
        let pixel_offset = 0;
        const calc_match = value.match(/calc\(\s*([0-9.]*)%\s*([-+])\s*([0-9]*)px/);
        if (calc_match) {
            percent = parseFloat(calc_match[1]);
            pixel_offset = parseInt(calc_match[3]);
            if (calc_match[2] === "-") {
                pixel_offset = -pixel_offset;
            }
        } else if (String(value).includes('%')) {
            percent = parseFloat(value.replace('%', ''));
        } else {
            pixel_offset = parseInt(value, 10);
        }
        return {
            percent,
            pixel_offset
        }
    }

    /**
     * converts px to % for  width/height/left/right/top/bottom
     * @param element a DOM element
     * @param property width/height or direction
     * @param value property value in px
     */
    function to_relative_percent(element, property, value) {
        const offsetParent = element.offsetParent;
        if (!offsetParent) {
            return 0;
        }
        let target_style_property = property; // width/height
        if (sides_containers.hasOwnProperty(property)) {
            target_style_property = sides_containers[property]; //left/right/top/bottom
        }
        const parent_size = Math.max(1, parseInt(getComputedStyle(offsetParent)[target_style_property], 10));
        return parseFloat(100 * value / parent_size);
    }

    /**
     * this funciton changes px positioniong to % and back, keeping the element at the same place
     * margins are dissovled into position
     * @param element - target element to modify
     * @param new_props - next props map e.g.: {width:'100px',left:'10%'} will change element's width by px and left by %...
     * ... if the element previosly had 'right', 'right-margin' it will be reomved while keeping element in the same place
     */
    function convert_to_matching_positioning(element, new_props) {


        const computed_element_style = getComputedStyle(element);

        Object.entries(new_props).forEach(([property, value]) => {
            if (sides_opposites.hasOwnProperty(property)) {
                const to_percent = String(value).includes('%');

                let new_prop_value = parseInt(computed_element_style[property], 10) +
                    parseInt(computed_element_style['margin-' + property], 10);

                if (to_percent) {
                    new_prop_value = to_relative_percent(element, property, new_prop_value).toFixed(4) + '%';
                } else {
                    new_prop_value += 'px';
                }

                element.style[property] = new_prop_value;
                element.style['margin-' + property] = 0;
                element.style['margin-' + sides_opposites[property]] = 0;

                if (element.style[sides_opposites[property]]) {
                    element.style[sides_opposites[property]] = 'auto';
                }
            } else if (containers.includes(property)) {
                const to_percent = String(value).includes('%');
                let new_prop_value = parseInt(computed_element_style[property]);
                if (to_percent) {
                    new_prop_value = to_relative_percent(element, property, new_prop_value).toFixed(4) + '%';
                } else {
                    new_prop_value += 'px';
                }
                element.style[property] = new_prop_value;
            }
        });
    }

    /** this function sets up  listeners. when a listener is activated event_handler is called.
     * it returns a cleanup closure which cleans up those listeners when invoked
     **/
    function setup_listener(root_element, listener_specs, event_handler) {
        let cleaner = null;

        if (listener_specs.listener_type === "timer") {
            const timeout = setTimeout(event_handler, listener_specs.delay);
            cleaner = () => clearTimeout(timeout)
        } else if (['click', 'mouseenter', 'mouseleave'].includes(listener_specs.listener_type)) {

            const target_element = listener_specs.target_selector === "" ? root_element : root_element.querySelector(listener_specs.target_selector);
            let event_handler_fixed = (event) => {
                if (event.type === 'click' || event.target === target_element) {
                    event.stopPropagation();
                    event_handler();
                }
            };

            // these will set pointer-events and cursor for nested elements
            target_element.classList.add('anima-listeners-active');

            if (listener_specs.listener_type === "click") {
                target_element.classList.add('anima-listeners-active-click');
            }

            target_element.addEventListener(listener_specs.listener_type, event_handler_fixed, true);
            cleaner = () => {
                target_element.removeEventListener(listener_specs.listener_type, event_handler_fixed, true);
                target_element.classList.remove('anima-listeners-active');
                target_element.classList.remove('anima-listeners-active-click');
            };
        }
        return cleaner;
    }

    function animate_elements(root_element, selector_to_properties_map, transition_props) {
        Object.entries(selector_to_properties_map).forEach(([selector, prop_values_map]) => {
            const element = selector === "" ? root_element : root_element.querySelector(selector);
            if (element) {

                const update_element_visibility = (visible) => {
                    if (visible) {
                        element.classList.toggle("anima-hidden", false)
                    } else {
                        element.classList.toggle("anima-hidden", true)
                    }
                };
                update_element_visibility(prop_values_map['opacity'] > 0 || getComputedStyle(element).opacity > 0.001 );

                // remove current animations, pausing elements in their current state
                anime.remove(element);
                let full_params = {
                    ...transition_props, // transition properties: easing, duration...
                    ...prop_values_map, // this element's animated properties: width? color? ...
                    targets: [element],
                    complete: () => update_element_visibility(getComputedStyle(element).opacity > 0.001)
                };


                // translate to anime js form
                if (prop_values_map.hasOwnProperty("transform")) {
                    const transform_val = full_params['transform'];
                    delete full_params['transform'];
                    transform_val.match(/\S*\([^)]*/g).map((x) => x.split('(')).forEach(([key, val]) => {
                            full_params[key] = val;
                        }
                    );
                }

                //match css easing curves
                if (full_params.hasOwnProperty("easing")) {
                    const mapping = {
                        // linear: 'linear',
                        "ease-in-out": "cubicBezier(0.42, 0, 0.58, 1)",
                        "ease-in": "cubicBezier(0.42, 0, 1, 1)",
                        "ease-out": "cubicBezier(0, 0, 0.58, 1)",
                    };
                    let ease = full_params["easing"].trim();
                    if (mapping.hasOwnProperty(ease)) {
                        ease = mapping[ease];
                    } else if (ease.startsWith('cubic-bezier')) {
                        ease = ease.replace('cubic-bezier', 'cubicBezier');
                    }
                    full_params["easing"] = ease;
                }

                // "width", "height",
                convert_to_matching_positioning(element, full_params);

                Object.keys(sides_opposites).forEach((side) => {
                    if (full_params.hasOwnProperty(side)) {
                        const value = full_params[side];
                        let {percent, pixel_offset} = normalize_to_percent_and_offset(value);
                        if (Math.abs(percent) < 0.001) {
                            full_params[side] = pixel_offset + 'px';
                        } else {
                            full_params[side] = percent + '%';
                            full_params['margin-' + side] = pixel_offset + 'px';
                        }
                        element.style[sides_opposites[side]] = 'auto';
                    }
                });
                containers.forEach((container) => {
                    if (full_params.hasOwnProperty(container)) {
                        const value = full_params[container];
                        let {percent, pixel_offset} = normalize_to_percent_and_offset(value);
                        if (Math.abs(percent) < 0.001) {
                            full_params[container] = pixel_offset + 'px';
                        } else {
                            if (Math.abs(pixel_offset) > 0) {
                                // convert pixels to additional percents
                                percent += to_relative_percent(element, container, pixel_offset);
                                percent = Math.max(0, percent);
                            }
                            full_params[container] = percent + '%';
                        }
                    }
                });

                anime(full_params); // anime js library globally available
            }
        })
    }

    function get_changed_properties_between_states(initial_element_state, from_state_element_state, to_state_element_state) {
        /**
         this function returns a mapping from elements affected by either states
         to their properties in 'to_state'
         e.g. {"#some_obj": {width: 100, height: 50}}
         values changed by 'from_state' are reverted to initial values
         **/
        let selector_to_props = {};

        // set all old state properties back to initial
        Object.entries(from_state_element_state).forEach(([selector, properties]) => {
            selector_to_props[selector] = selector_to_props[selector] || {};
            Object.entries(properties).forEach(([property, value]) => {
                selector_to_props[selector][property] = initial_element_state[selector][property];
            });
        });

        // override with new state properties
        Object.entries(to_state_element_state).forEach(([selector, properties]) => {
            selector_to_props[selector] = selector_to_props[selector] || {};
            Object.entries(properties).forEach(([property, value]) => {
                selector_to_props[selector][property] = value;
            });
        });

        return selector_to_props;
    }


    function transitioning_to_state(root_element, initial_properties, states_flow, now_state_name, transition_animation_time) {
        /**
         * called when a changing to a new state
         * registers listeners such as on_click, timers...
         * recursively calls itself and remove listeners when a listener is fired
         */
        const new_state_flow = states_flow[now_state_name];

        // set up new listeners
        let listener_cleanup_callbacks = [];

        for (const listener_specs of new_state_flow.listeners) {

            // this function is only called when the listener is fired
            function on_listener_run() {

                // remove all current listeners
                listener_cleanup_callbacks.forEach(callback => callback());
                listener_cleanup_callbacks = [];

                const next_state_name = listener_specs.change_to_state;


                const this_state_element_state = states_flow[now_state_name].overrides;
                const next_state_element_state = states_flow[next_state_name].overrides;

                // get all animated properties between the two states
                let element_selector_to_changed_properties = get_changed_properties_between_states(initial_properties, this_state_element_state, next_state_element_state);


                let longest_animation_time_ms = 0;

                Object.entries(listener_specs.animations).forEach(([selector, animation_specs]) => {
                    let filtered_props = {};
                    if (element_selector_to_changed_properties.hasOwnProperty(selector)) {
                        filtered_props[selector] = element_selector_to_changed_properties[selector];
                        longest_animation_time_ms = Math.max(longest_animation_time_ms, animation_specs.delay + animation_specs.duration);
                        animate_elements(root_element, filtered_props, animation_specs)
                    }
                });

                transitioning_to_state(root_element, initial_properties, states_flow, next_state_name, longest_animation_time_ms);
            }

            let final_listener_specs = {...listener_specs};
            if (listener_specs.listener_type === 'timer') {
                // timers should start ticking after animation is over
                final_listener_specs.delay += transition_animation_time;
            }
            const cleanup_callback = setup_listener(root_element, final_listener_specs, on_listener_run);
            listener_cleanup_callbacks.push(cleanup_callback);
        }
    }


    function run_when_doc_ready(fn) {

        // make sure anime js is loaded and available globally
        if (!document.getElementById('anime-js-script')) {
            let animejs_element = document.createElement('script');
            animejs_element.id = "anime-js-script";
            animejs_element.setAttribute('src', 'https://cdn.jsdelivr.net/npm/animejs@3.1.0/lib/anime.min.js');
            animejs_element.setAttribute('integrity', 'sha256-98Q574VkbV+PkxXCKSgL6jVq9mrVbS7uCdA+vt0sLS8=');
            animejs_element.setAttribute('crossorigin', 'anonymous');
            document.head.appendChild(animejs_element);
        }
        if (window.anime === undefined) {
            setTimeout(() => run_when_doc_ready(fn), 50);
            return;
        }

        // see if DOM is already available
        if (document.readyState === "complete" || document.readyState === "interactive") {
            // call on next available tick
            setTimeout(fn, 1);
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }

    function load_initial_values(anima_components) {
        anima_components.forEach((anima_component) => {
            const root_element = document.querySelector(anima_component.root_element);
            const states_flow = anima_component.states_flow;
            const initial_state_name = anima_component.initial_state_name;
            // const initial_properties = anima_component.initial_properties;


            let initial_properties = {};
            Object.values(anima_component.states_flow).forEach((state_spec) => {
                Object.entries(state_spec.overrides).forEach(([selector, properties]) => {
                    initial_properties[selector] = initial_properties[selector] || {};
                    const element = selector === "" ? root_element : root_element.querySelector(selector);
                    Object.keys(properties).forEach((property) => {
                        initial_properties[selector][property] = element.style[property] ||
                            property === 'transform' && 'rotate(0deg)' ||
                            window.getComputedStyle(element)[property];
                    })
                });
            });
            // set properties to first state
            Object.entries(anima_component.states_flow[initial_state_name].overrides).forEach(([selector, properties]) => {
                const element = selector === "" ? root_element : root_element.querySelector(selector);
                animate_elements(element, {"": properties}, {duration: 0})
            });
            transitioning_to_state(root_element, initial_properties, states_flow, initial_state_name, 0);
        });
        document.querySelectorAll('.anima-not-ready').forEach((x) => x.classList.remove('anima-not-ready'));
    }

    run_when_doc_ready(() => load_initial_values(anima_components));

    // each of these describes a timeline 
    const anima_components = [
  {
    "initial_state_name": "keyframe1", 
    "root_element": ".heroleft", 
    "states_flow": {
      "keyframe1": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 400, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".blackdot2": {
                "delay": 400, 
                "duration": 600, 
                "easing": "ease-in-out"
              }, 
              ".blackdot3": {
                "delay": 400, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".bluedot1": {
                "delay": 400, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".bluedot2": {
                "delay": 400, 
                "duration": 600, 
                "easing": "ease-in-out"
              }, 
              ".bluedot3": {
                "delay": 400, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".line1": {
                "delay": 0, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".line10": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line11": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line12": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line13": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line14": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line15": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line16": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line17": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line18": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line19": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line20": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line21": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line22": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line4": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line5": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line6": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line7": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line8": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line9": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }
            }, 
            "change_to_state": "keyframe2", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".bluedot1": {
            "opacity": "0.0", 
            "top": "173px"
          }, 
          ".bluedot2": {
            "opacity": "0.0", 
            "top": "173px"
          }, 
          ".bluedot3": {
            "opacity": "0.0", 
            "top": "173px"
          }, 
          ".line1": {
            "opacity": "0.0"
          }, 
          ".line10": {
            "opacity": "0.0"
          }, 
          ".line11": {
            "opacity": "0.0"
          }, 
          ".line12": {
            "opacity": "0.0"
          }, 
          ".line13": {
            "opacity": "0.0"
          }, 
          ".line14": {
            "opacity": "0.0"
          }, 
          ".line15": {
            "opacity": "0.0"
          }, 
          ".line16": {
            "opacity": "0.0"
          }, 
          ".line17": {
            "opacity": "0.0"
          }, 
          ".line18": {
            "opacity": "0.0"
          }, 
          ".line19": {
            "opacity": "0.0"
          }, 
          ".line2": {
            "opacity": "0.0"
          }, 
          ".line20": {
            "opacity": "0.0"
          }, 
          ".line21": {
            "opacity": "0.0"
          }, 
          ".line22": {
            "opacity": "0.0"
          }, 
          ".line3": {
            "opacity": "0.0"
          }, 
          ".line4": {
            "opacity": "0.0"
          }, 
          ".line5": {
            "opacity": "0.0"
          }, 
          ".line6": {
            "opacity": "0.0"
          }, 
          ".line7": {
            "opacity": "0.0"
          }, 
          ".line8": {
            "opacity": "0.0"
          }, 
          ".line9": {
            "opacity": "0.0"
          }
        }
      }, 
      "keyframe2": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot1": {
                "delay": 0, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".bluedot2": {
                "delay": 0, 
                "duration": 600, 
                "easing": "ease-in-out"
              }, 
              ".bluedot3": {
                "delay": 0, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".line1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line10": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line11": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line12": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line13": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line14": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line15": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line16": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line17": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line18": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line19": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line20": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line21": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line22": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line4": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line5": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line6": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line7": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line8": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line9": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }
            }, 
            "change_to_state": "keyframe3", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".blackdot1": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".blackdot2": {
            "bottom": "18.97%", 
            "opacity": "0.0"
          }, 
          ".blackdot3": {
            "bottom": "18.97%", 
            "opacity": "0.0"
          }, 
          ".bluedot1": {
            "top": "150px"
          }, 
          ".bluedot2": {
            "top": "150px"
          }, 
          ".bluedot3": {
            "top": "150px"
          }, 
          ".line1": {
            "opacity": "0.0"
          }, 
          ".line10": {
            "opacity": "0.0"
          }, 
          ".line11": {
            "opacity": "0.0"
          }, 
          ".line12": {
            "opacity": "0.0"
          }, 
          ".line13": {
            "opacity": "0.0"
          }, 
          ".line14": {
            "opacity": "0.0"
          }, 
          ".line15": {
            "opacity": "0.0"
          }, 
          ".line16": {
            "opacity": "0.0"
          }, 
          ".line17": {
            "opacity": "0.0"
          }, 
          ".line18": {
            "opacity": "0.0"
          }, 
          ".line19": {
            "opacity": "0.0"
          }, 
          ".line2": {
            "opacity": "0.0"
          }, 
          ".line20": {
            "opacity": "0.0"
          }, 
          ".line21": {
            "opacity": "0.0"
          }, 
          ".line22": {
            "opacity": "0.0"
          }, 
          ".line3": {
            "opacity": "0.0"
          }, 
          ".line4": {
            "opacity": "0.0"
          }, 
          ".line5": {
            "opacity": "0.0"
          }, 
          ".line6": {
            "opacity": "0.0"
          }, 
          ".line7": {
            "opacity": "0.0"
          }, 
          ".line8": {
            "opacity": "0.0"
          }, 
          ".line9": {
            "opacity": "0.0"
          }
        }
      }, 
      "keyframe3": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot1": {
                "delay": 0, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".bluedot2": {
                "delay": 0, 
                "duration": 600, 
                "easing": "ease-in-out"
              }, 
              ".bluedot3": {
                "delay": 0, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".line1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line10": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line11": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line12": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line13": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line14": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line15": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line16": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line17": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line18": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line19": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line20": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line21": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line22": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line4": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line5": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line6": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line7": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line8": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line9": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }
            }, 
            "change_to_state": "keyframe4", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".blackdot1": {
            "opacity": "0.0", 
            "top": "144px"
          }, 
          ".blackdot2": {
            "bottom": "22.05%", 
            "opacity": "0.0"
          }, 
          ".blackdot3": {
            "bottom": "22.05%", 
            "opacity": "0.0"
          }, 
          ".bluedot1": {
            "top": "173px"
          }, 
          ".bluedot2": {
            "top": "173px"
          }, 
          ".bluedot3": {
            "top": "173px"
          }, 
          ".line1": {
            "opacity": "0.0"
          }, 
          ".line10": {
            "opacity": "0.0"
          }, 
          ".line11": {
            "opacity": "0.0"
          }, 
          ".line12": {
            "opacity": "0.0"
          }, 
          ".line13": {
            "opacity": "0.0"
          }, 
          ".line14": {
            "opacity": "0.0"
          }, 
          ".line15": {
            "opacity": "0.0"
          }, 
          ".line16": {
            "opacity": "0.0"
          }, 
          ".line17": {
            "opacity": "0.0"
          }, 
          ".line18": {
            "opacity": "0.0"
          }, 
          ".line19": {
            "opacity": "0.0"
          }, 
          ".line2": {
            "opacity": "0.0"
          }, 
          ".line20": {
            "opacity": "0.0"
          }, 
          ".line21": {
            "opacity": "0.0"
          }, 
          ".line22": {
            "opacity": "0.0"
          }, 
          ".line3": {
            "opacity": "0.0"
          }, 
          ".line4": {
            "opacity": "0.0"
          }, 
          ".line5": {
            "opacity": "0.0"
          }, 
          ".line6": {
            "opacity": "0.0"
          }, 
          ".line7": {
            "opacity": "0.0"
          }, 
          ".line8": {
            "opacity": "0.0"
          }, 
          ".line9": {
            "opacity": "0.0"
          }
        }
      }, 
      "keyframe4": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot1": {
                "delay": 0, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".bluedot2": {
                "delay": 0, 
                "duration": 600, 
                "easing": "ease-in-out"
              }, 
              ".bluedot3": {
                "delay": 0, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".line1": {
                "delay": 400, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".line10": {
                "delay": 1600, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line11": {
                "delay": 1700, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line12": {
                "delay": 1800, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line13": {
                "delay": 1900, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line14": {
                "delay": 2000, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line15": {
                "delay": 2100, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line16": {
                "delay": 2300, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line17": {
                "delay": 2200, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line18": {
                "delay": 2400, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line19": {
                "delay": 2500, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line2": {
                "delay": 700, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line20": {
                "delay": 2600, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line21": {
                "delay": 2700, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line22": {
                "delay": 2800, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line3": {
                "delay": 900, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line4": {
                "delay": 1000, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line5": {
                "delay": 1100, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line6": {
                "delay": 1200, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line7": {
                "delay": 1300, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line8": {
                "delay": 1400, 
                "duration": 500, 
                "easing": "ease-in-out"
              }, 
              ".line9": {
                "delay": 1500, 
                "duration": 500, 
                "easing": "ease-in-out"
              }
            }, 
            "change_to_state": "keyframe5", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".blackdot1": {
            "opacity": "0.0", 
            "top": "144px"
          }, 
          ".blackdot2": {
            "bottom": "22.05%", 
            "opacity": "0.0"
          }, 
          ".blackdot3": {
            "bottom": "22.05%", 
            "opacity": "0.0"
          }, 
          ".bluedot1": {
            "top": "150px"
          }, 
          ".bluedot2": {
            "top": "150px"
          }, 
          ".bluedot3": {
            "top": "150px"
          }, 
          ".line1": {
            "height": "6px", 
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".line10": {
            "height": "16px", 
            "opacity": "0.0"
          }, 
          ".line11": {
            "height": "10px", 
            "opacity": "0.0"
          }, 
          ".line12": {
            "height": "6px", 
            "opacity": "0.0"
          }, 
          ".line13": {
            "height": "4px", 
            "opacity": "0.0"
          }, 
          ".line14": {
            "height": "6px", 
            "opacity": "0.0"
          }, 
          ".line15": {
            "height": "8px", 
            "opacity": "0.0"
          }, 
          ".line16": {
            "height": "3px", 
            "opacity": "0.0"
          }, 
          ".line17": {
            "height": "2px", 
            "opacity": "0.0"
          }, 
          ".line18": {
            "height": "7px", 
            "opacity": "0.0"
          }, 
          ".line19": {
            "height": "10px", 
            "opacity": "0.0"
          }, 
          ".line2": {
            "height": "6px", 
            "opacity": "0.0"
          }, 
          ".line20": {
            "height": "6px", 
            "opacity": "0.0"
          }, 
          ".line21": {
            "height": "4px", 
            "opacity": "0.0"
          }, 
          ".line22": {
            "height": "3px", 
            "opacity": "0.0"
          }, 
          ".line3": {
            "bottom": "17.44%", 
            "height": "5.13%", 
            "opacity": "0.0"
          }, 
          ".line4": {
            "bottom": "16.92%", 
            "height": "8.21%", 
            "opacity": "0.0"
          }, 
          ".line5": {
            "bottom": "17.44%", 
            "height": "5.13%", 
            "opacity": "0.0"
          }, 
          ".line6": {
            "bottom": "16.92%", 
            "height": "3.08%", 
            "opacity": "0.0"
          }, 
          ".line7": {
            "bottom": "16.41%", 
            "height": "2.05%", 
            "opacity": "0.0"
          }, 
          ".line8": {
            "bottom": "16.92%", 
            "height": "3.08%", 
            "opacity": "0.0"
          }, 
          ".line9": {
            "height": "10px", 
            "opacity": "0.0"
          }
        }
      }, 
      "keyframe5": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".blackdot3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line10": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line11": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line12": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line13": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line14": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line15": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line16": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line17": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line18": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line19": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line20": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line21": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line22": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line4": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line5": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line6": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line7": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line8": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line9": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }
            }, 
            "change_to_state": "keyframe6", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".blackdot1": {
            "opacity": "0.0", 
            "top": "144px"
          }, 
          ".blackdot2": {
            "bottom": "22.05%", 
            "opacity": "0.0"
          }, 
          ".blackdot3": {
            "bottom": "22.05%", 
            "opacity": "0.0"
          }, 
          ".bluedot1": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".bluedot2": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".bluedot3": {
            "height": "6px", 
            "left": "255px", 
            "opacity": "0.0", 
            "top": "150px", 
            "width": "1px"
          }, 
          ".line1": {
            "top": "150px", 
            "width": "3px"
          }, 
          ".line10": {
            "width": "3px"
          }, 
          ".line11": {
            "width": "3px"
          }, 
          ".line12": {
            "width": "3px"
          }, 
          ".line13": {
            "width": "3px"
          }, 
          ".line14": {
            "width": "3px"
          }, 
          ".line15": {
            "width": "3px"
          }, 
          ".line16": {
            "width": "3px"
          }, 
          ".line17": {
            "width": "3px"
          }, 
          ".line18": {
            "width": "3px"
          }, 
          ".line19": {
            "width": "3px"
          }, 
          ".line2": {
            "width": "3px"
          }, 
          ".line20": {
            "width": "3px"
          }, 
          ".line21": {
            "width": "3px"
          }, 
          ".line22": {
            "width": "3px"
          }, 
          ".line3": {
            "right": "35.70%", 
            "width": "0.71%"
          }, 
          ".line4": {
            "right": "33.81%", 
            "width": "0.71%"
          }, 
          ".line5": {
            "right": "32.15%", 
            "width": "0.71%"
          }, 
          ".line6": {
            "right": "30.50%", 
            "width": "0.71%"
          }, 
          ".line7": {
            "right": "28.84%", 
            "width": "0.71%"
          }, 
          ".line8": {
            "right": "27.19%", 
            "width": "0.71%"
          }, 
          ".line9": {
            "width": "3px"
          }
        }
      }, 
      "keyframe6": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 0, 
                "duration": 400, 
                "easing": "ease-in-out"
              }, 
              ".blackdot2": {
                "delay": 0, 
                "duration": 600, 
                "easing": "ease-in-out"
              }, 
              ".blackdot3": {
                "delay": 0, 
                "duration": 800, 
                "easing": "ease-in-out"
              }, 
              ".bluedot1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".bluedot3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line1": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line10": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line11": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line12": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line13": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line14": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line15": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line16": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line17": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line18": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line19": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line2": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line20": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line21": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line22": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line3": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line4": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line5": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line6": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line7": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line8": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }, 
              ".line9": {
                "delay": 0, 
                "duration": 200, 
                "easing": "ease-in-out"
              }
            }, 
            "change_to_state": "keyframe7", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".blackdot1": {
            "opacity": "0.0"
          }, 
          ".blackdot2": {
            "opacity": "0.0"
          }, 
          ".blackdot3": {
            "opacity": "0.0"
          }, 
          ".bluedot1": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".bluedot2": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".bluedot3": {
            "height": "6px", 
            "left": "255px", 
            "opacity": "0.0", 
            "top": "150px", 
            "width": "1px"
          }, 
          ".line1": {
            "opacity": "0.0", 
            "top": "150px", 
            "width": "3px"
          }, 
          ".line10": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line11": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line12": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line13": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line14": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line15": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line16": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line17": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line18": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line19": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line2": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line20": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line21": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line22": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line3": {
            "opacity": "0.0", 
            "right": "35.70%", 
            "width": "0.71%"
          }, 
          ".line4": {
            "opacity": "0.0", 
            "right": "33.81%", 
            "width": "0.71%"
          }, 
          ".line5": {
            "opacity": "0.0", 
            "right": "32.15%", 
            "width": "0.71%"
          }, 
          ".line6": {
            "opacity": "0.0", 
            "right": "30.50%", 
            "width": "0.71%"
          }, 
          ".line7": {
            "opacity": "0.0", 
            "right": "28.84%", 
            "width": "0.71%"
          }, 
          ".line8": {
            "opacity": "0.0", 
            "right": "27.19%", 
            "width": "0.71%"
          }, 
          ".line9": {
            "opacity": "0.0", 
            "width": "3px"
          }
        }
      }, 
      "keyframe7": {
        "listeners": [
          {
            "animations": {
              ".blackdot1": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".blackdot2": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".blackdot3": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".bluedot1": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".bluedot2": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".bluedot3": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line1": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line10": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line11": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line12": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line13": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line14": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line15": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line16": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line17": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line18": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line19": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line2": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line20": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line21": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line22": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line3": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line4": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line5": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line6": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line7": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line8": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }, 
              ".line9": {
                "delay": 0, 
                "duration": 0, 
                "easing": "linear"
              }
            }, 
            "change_to_state": "keyframe1", 
            "delay": 0, 
            "listener_type": "timer"
          }
        ], 
        "overrides": {
          ".bluedot1": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".bluedot2": {
            "opacity": "0.0", 
            "top": "150px"
          }, 
          ".bluedot3": {
            "height": "6px", 
            "left": "255px", 
            "opacity": "0.0", 
            "top": "150px", 
            "width": "1px"
          }, 
          ".line1": {
            "opacity": "0.0", 
            "top": "150px", 
            "width": "3px"
          }, 
          ".line10": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line11": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line12": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line13": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line14": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line15": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line16": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line17": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line18": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line19": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line2": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line20": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line21": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line22": {
            "opacity": "0.0", 
            "width": "3px"
          }, 
          ".line3": {
            "opacity": "0.0", 
            "right": "35.70%", 
            "width": "0.71%"
          }, 
          ".line4": {
            "opacity": "0.0", 
            "right": "33.81%", 
            "width": "0.71%"
          }, 
          ".line5": {
            "opacity": "0.0", 
            "right": "32.15%", 
            "width": "0.71%"
          }, 
          ".line6": {
            "opacity": "0.0", 
            "right": "30.50%", 
            "width": "0.71%"
          }, 
          ".line7": {
            "opacity": "0.0", 
            "right": "28.84%", 
            "width": "0.71%"
          }, 
          ".line8": {
            "opacity": "0.0", 
            "right": "27.19%", 
            "width": "0.71%"
          }, 
          ".line9": {
            "opacity": "0.0", 
            "width": "3px"
          }
        }
      }
    }
  }
];
})();