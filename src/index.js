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
  <h1 style='background: orange; color: white' title='introduction'>
    <p> LiteReact Library</p>
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

  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }

  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    if (index == 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
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

let nextUnitOfWork = null;
let workInProgressRoot = null;

function render(element, container) {
  workInProgressRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = workInProgressRoot;
}

function commitRoot() {
  commitWork(workInProgressRoot.child);
  workInProgressRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;

  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

LiteReact.render(element, container);
