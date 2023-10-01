const LiteReact = {
  createElement,
  render,
  useState,
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

  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) return fiber.child;

  let nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}

let workInProgressFiber = null;
let hookIndex = null;

function updateFunctionComponent(fiber) {
  workInProgressFiber = fiber;
  workInProgressFiber.hooks = [];
  hookIndex = 0;
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function reconcileChildren(workInProgressRoot, elements) {
  let index = 0;
  let prevSibling = null;
  let oldFiber =
    workInProgressRoot.prevCommit && workInProgressRoot.prevCommit.child;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    const sameType =
      workInProgressRoot.prevCommit && element && element.type == oldFiber.type;

    if (sameType) {
      // this is update
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: workInProgressRoot,
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
        parent: workInProgressRoot,
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
      workInProgressRoot.child = newFiber;
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
let workInProgressRoot = null;
let currentRoot = null;
let deletions = null;

function render(element, container) {
  workInProgressRoot = {
    dom: container,
    props: {
      children: [element],
    },
    prevCommit: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = workInProgressRoot;
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(workInProgressRoot.child);
  currentRoot = workInProgressRoot;
  workInProgressRoot = null;
}

function commitWork(fiberObject) {
  if (!fiberObject) return;

  let domParentFiber = fiberObject.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }

  const domParent = domParentFiber.dom;

  if (fiberObject.effectTag === 'PLACEMENT' && fiberObject.dom != null) {
    domParent.appendChild(fiberObject.dom);
  } else if (fiberObject.effectTag === 'DELETION') {
    // domParent.removeChild(fiberObject.dom);
    commitDeletion(fiberObject, domParent);
  } else if (fiberObject.effectTag === 'UPDATE' && fiberObject.dom != null) {
    updateDOM(fiberObject.dom, fiberObject.prevCommit.props, fiberObject.props);
  }
  commitWork(fiberObject.child);
  commitWork(fiberObject.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
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

function useState(initial) {
  const oldHook =
    workInProgressFiber.prevCommit &&
    workInProgressFiber.prevCommit.hooks &&
    workInProgressFiber.prevCommit.hooks[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];

  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    hook.queue.push(action);
    workInProgressRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      prevCommit: currentRoot,
    };

    nextUnitOfWork = workInProgressRoot;
    deletions = [];
  };

  workInProgressFiber.hooks.push(hook);
  hookIndex++;

  return [hook.state, setState];
}

/** @jsx LiteReact.createElement  */
function App({ name }) {
  const [state, setState] = LiteReact.useState(1);
  return <h1 onclick={() => setState((c) => c + 1)}>count: {state}</h1>;
}

const element = <App name='LiteReact library' />;
const container = document.getElementById('root');
LiteReact.render(element, container);
