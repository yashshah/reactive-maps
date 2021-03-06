import { default as React, Component } from 'react';
import { render } from 'react-dom';
var Style = require('../Style.js');

export class ItemList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItem: []
    };
    this.handleClick = this.handleClick.bind(this);
  }
  // Handler function is called when the list item is clicked
  handleClick(value) {
    // Pass the previously selected value to be removed from the query
    this.props.onRemove(this.state.selectedItem);
    // Pass the new selected value to be added to the query    
    this.props.onSelect(value);
    this.setState({
      selectedItem: value
    });
  }
  render() {
    let items = this.props.items;
    let itemsComponent = [];
    // Build the array of components for each item
    items.forEach(function (item) {
      itemsComponent.push(<ItemRow
        key={item.key}
        value={item.key}
        doc_count={item.doc_count}
        countField={this.props.showCount}
        handleClick={this.handleClick}
        selectedItem={this.state.selectedItem}/>)
    }.bind(this));
    return (
      <div style={Style.divScroll}>
        {itemsComponent}
      </div>
    );
  }
}
class ItemRow extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    let count;
    // Check if user wants to show count field
    if (this.props.countField) {
      count = <span> ({this.props.doc_count}) </span>;
    }
    return (
      <div onClick={this.props.handleClick.bind(null, this.props.value) }
        style={this.props.value === this.props.selectedItem ? Style.selectedListItem : Style.listItem}>
        <a href="#">
          <span> {this.props.value} </span>
          {count}
        </a>
      </div>
    );
  }
}