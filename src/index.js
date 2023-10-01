const container = document.getElementById('root');

const LiteReact = {
  createElement,
  render,
};

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        if (typeof child === 'object') return child;
        else return createTextElement(child);
      }),
    },
  };
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/** @jsx LiteReact.createElement  */
const element = (
  <h1 style='background: red; color: white' title='introduction'>
    <p
      onclick={function () {
        alert('clicked');
      }}
    >
      LiteReact Library
    </p>
  </h1>
);

requestIdleCallback(workLoop);

function createDOM(fiber) {
  //1. create DOM node
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);

  //2. Add all properties/attributes
  Object.keys(fiber.props)
    .filter((key) => {
      if (key !== 'children') return true;
    })
    .forEach((propName) => {
      dom[propName] = fiber.props[propName];
    });

  return dom;
}

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && workInProgressFiber) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }

  const elements = fiber.props.children;

  reconcileChildren(fiber, elements);

  if (fiber.child) return fiber.child;

  let nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function reconcileChildren(workInProgressFiber, elements) {
  let index = 0;
  let prevSibling = null;
  let oldFiber =
    workInProgressFiber.prevCommit && workInProgressFiber.prevCommit.child;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    const sameType =
      workInProgressFiber.prevCommit &&
      element &&
      element.type == oldFiber.type;

    if (sameType) {
      // this is update
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom, /////
        parent: workInProgressFiber,
        prevCommit: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    if (element && !sameType) {
      // addition
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null, /////
        parent: workInProgressFiber,
        prevCommit: null,
        effectTag: 'PLACEMENT',
      };
    }
    if (oldFiber && !sameType) {
      // delete
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    if (index == 0) {
      workInProgressFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    prevSibling = newFiber;
    index++;
  }
}

let nextUnitOfWork = null;
let workInProgressFiber = null;
let currentRoot = null;
let deletions = null;

function render(element, container) {
  workInProgressFiber = {
    dom: container,
    props: {
      children: [element],
    },
    prevCommit: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = workInProgressFiber;
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(workInProgressFiber.child);
  currentRoot = workInProgressFiber;
  workInProgressFiber = null;
}

function commitWork(fiberObject) {
  if (!fiberObject) return;

  const domParent = fiberObject.parent.dom;

  if (fiberObject.effectTag === 'PLACEMENT' && fiberObject.dom != null) {
    domParent.appendChild(fiberObject.dom);
  } else if (fiberObject.effectTag === 'DELETION') {
    domParent.removeChild(fiberObject.dom);
  } else if (fiberObject.effectTag === 'UPDATE' && fiberObject.dom != null) {
    updateDOM(fiberObject.dom, fiberObject.prevCommit.props, fiberObject.props);
  }
  commitWork(fiberObject.child);
  commitWork(fiberObject.sibling);
}

const isEvent = (key) => key.startsWith('on');
const isProperty = (key) => key !== 'children' && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

function updateDOM(dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });

  // Remove old props from dom
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = '';
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });
}

LiteReact.render(element, container);
