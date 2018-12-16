/** 
 * Contextmenu click listener;
 * it sends data to bacgkround script about element 
 * on which context menu was called;
 * 
 * 
 * @param {Event} e 
 */
var variable = NaN;
var a = 0;

function rightClickListener(e) {
    let 
        tmp = e.target,
        elemParent = e.target.parentElement,

        // Choose parent element (if it is a link) 
        // instead of current element as it can be svg, img, etc.
        elem = elemParent.tagName === 'A' ? elemParent : tmp,

        // choose HTML node text from some existing text property
        elementText = elem.innerText || elem.contentText || elem.text;

        // set text value to empty string if it is undefined or null
        if (!elementText) {
            elementText = "";
        }
        
    /** 
     * Object that contains HTML element data:
     * text, attributes, base url (https://*.*)
     * 
     * @type {Object}
     */
    let nodeData = {
        url: window.location.hostname,
        text: elementText,
        tagName: elem.tagName
    }

    // Add attributes of element to nodeData object
    for (attr of elem.attributes) {
        nodeData[attr.name] = attr.value;
    }

    browser.runtime.sendMessage({ action: "element", element: nodeData });
}



/**
 * Normalize spaces, tabulation, CRLF etc.
 * e.g. "\t\n  Button \t" => " Button " => "Button"
 * 
 * @param {String} text
 * @returns {String}
 */
function formatHTMLText(text) {
    let 
        extraSpacesPattern = /(\r|\n|\t|\s{2,})/g,
        sideSpacesPattern = /(^\s|\s$)/g;

    return text.trim().replace(extraSpacesPattern, ' ')
        .replace(sideSpacesPattern, '');
}

/**
 * 
 * @param {String} xpath 
 * @returns {Element}
 */
function findElementsByXpath(xpath) {
    let elements = document.evaluate(xpath, 
        document, null, XPathResult.ANY_TYPE, 
        null);

    return elements;
}

/** 
 * Find HTML element by its data
 * 
 * @param {Object} elementData
 * @returns {Element} 
 */
function findElement(elementData) {
    let 
        text = formatHTMLText(elementData.text),
        className = elementData.class,
        xpath = `//*[contains(@class, '${className}')]`;
        
    let 
        // Get all elements that contain class string
        // from elementData object by xpath
        elements = findElementsByXpath(xpath),

        // Max number of attribute matches 
        // among found elements
        maxAttributeMatches = 0,

        // Number of attribute matches for current element 
        // (has 0 value with every loop iteration)
        // HINT: matches of attributes is number that 
        // shows how many elementData attributes
        // are stored in current element and how
        // many of their values are equal
        numAttributeMatches = 0,

        // Element that has max number of
        // attribute matches
        maxMatchesElement,

        // Value for looping through elements
        // changes every iteration
        elem;
    
    // Loop through all found by xpath elements
    // and figure out which one has max number
    // matches of attributes and its values
    while (elem = elements.iterateNext()) {

        // Loop through every attribute of 
        // current element and check it
        for (let attr in elementData) {
            if (elem.hasAttribute(attr)) {

                // +1 match if values of attributes in current 
                // element and elementData are equal 
                if (elem.getAttribute(attr) === elementData[attr]) {
                    numAttributeMatches++;
                }
            }
        }

        // +1 match if current element contains elementData.text
        if (elem.innerHTML.indexOf(text) !== -1) {
            numAttributeMatches++;
        }
        
        if (numAttributeMatches > maxAttributeMatches) {
            maxMatchesElement = elem;
            maxAttributeMatches = numAttributeMatches;
        }
    
        // Set number of matches for next iteration
        numAttributeMatches = 0;
    }

    // Undefined if no elements were found by xpath
    return maxMatchesElement;
}


/** 
 * Simulate bubbling user click on HTML element
 * 
 * @param {Element} element 
 */
function simulateClick(element) {

    let 
        bubbles = true,
        cancelable = true,
        view =  document.defaultView,
        detail =  0,
        screenx = 0,
        screeny = 0,
        clientx = 0,
        clienty = 0,
        ctrlkey = false,
        altkey = false,
        shiftkey = false,
        metakey = 0,
        button = null,
        relatedTarget = null;

    let simulateClickEvent = document.createEvent('MouseEvents');
    simulateClickEvent.initMouseEvent('click',
        bubbles, cancelable, view, detail,
        screenx, screeny, clientx, clienty,
        ctrlkey, altkey, shiftkey, metakey,
        button, relatedTarget);
    element.dispatchEvent(simulateClickEvent);
}


/** 
 * Set active page profile from background script response:
 * bind every key combination by Mousetrap.js lib
 * 
 * @param {Object} response 
 */
function setProfileFromResponse(response) {
    console.log(response.profile);
    
    // Remove old profile and load new
    Mousetrap.reset();
    for (let keyCombo in response.profile) {
        Mousetrap.bind(keyCombo.toLowerCase(), function() {
            
            // Get binded element data from profile 
            let elementData = response.profile[keyCombo];
            if (elementData.href) {
                window.location.replace(elementData.href);
            } else {
                simulateClick(findElement(elementData));
            }
        });
    }
}

function setProfile(profile) {
    if (!profile) return;
    profile = profile[window.location.hostname];

    // Remove old profile and load new
    Mousetrap.reset();
    for (let keyCombo in profile) {
        Mousetrap.bind(keyCombo.toLowerCase(), function() {
            
            // Get binded element data from profile 
            let elementData = profile[keyCombo];
            if (elementData.href) 
                window.location.replace(elementData.href);
            else
                simulateClick(findElement(elementData));
        });
    }
}




$(document).contextmenu(rightClickListener);

// get profile from storage DB and listen hotkeys from it
var gettingProfile = browser.storage.local.get(window.location.hostname);
gettingProfile.then(setProfile);