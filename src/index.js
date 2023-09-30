const container = document.getElementById('root');
// const root = ReactDOM.createRoot(container);

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
    LiteReact Library
  </h1>
);

// this is same as below - this is done by react under the hood

// const element = React.createElement(
//   'h1', // type of element
//   { title: 'introduction' }, // attributes
//   'Hello World' // children (i.e. this can also be an array of other elements)
// );

// React.createElement is further broken down in javascript object literal - something like below
// this will be used to figure out what the DOM should look like

// const element = {
//   type: 'h1',
//   props: {
//     title: 'introduction',
//     children: 'Hello World',
//   },
// };

function render(element, container) {
  //1. create DOM node
  const dom =
    element.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type);

  //2. Add all properties/attributes
  Object.keys(element.props)
    .filter((key) => {
      if (key !== 'children') return true;
    })
    .forEach((propName) => {
      dom[propName] = element.props[propName];
    });

  //3. Add all children
  element.props.children.forEach((child) => render(child, dom));

  //4. Render on screen
  container.appendChild(dom);
}

LiteReact.render(element, container);

// deconstructing render

// const node = document.createElement(element.type)
// node['title'] = element.props.title

// const text = document.createTextNode("");
// text["nodeValue"] = element.props.children;

// node.appendChild(text)
// container.appendChild(node)
