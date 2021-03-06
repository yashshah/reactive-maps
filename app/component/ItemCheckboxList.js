import { default as React, Component } from 'react';
import { render } from 'react-dom';
var Style = require('../Style.js');

export class ItemCheckboxList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItems: [],
    };
    this.handleListClick = this.handleListClick.bind(this);
    this.handleTagClick = this.handleTagClick.bind(this);
  }
  // Handler function when a checkbox is clicked
  handleListClick(value, selectedStatus) {
    // If the checkbox selectedStatus is true, then update selectedItems array
    if (selectedStatus) {
      var updated = this.state.selectedItems;
      updated.push(value);
      this.setState({
        selectedItems: updated
      });
      // Pass the props to parent components to add to the Query
      this.props.onSelect(value);
    }
    // If the checkbox selectedStatus is false
    // Call handleTagClick to remove it from the selected Items
    else {
      this.handleTagClick(value);
    }
  }
  // Handler function when a cancel button on tag is clicked to remove it
  handleTagClick(value) {
    var checkboxElement = eval(`this.refs.ref${value}`);
    checkboxElement.state.status = false;
    var updated = this.state.selectedItems;
    let index = updated.indexOf(value);
    updated.splice(index, 1);
    this.setState({
      selectedItems: updated
    });
    // Pass the removed value props to parent components to remove from the Query
    this.props.onRemove(value);
  }
  render() {
    let items = this.props.items;
    let selectedItems = this.state.selectedItems;
    var ListItemsArray = [];
    var TagItemsArray = [];
    // Build the array for the checkboxList items
    items.forEach(function (item) {
      ListItemsArray.push(<ListItem
        key={item.key}
        value={item.key}
        doc_count={item.doc_count}
        countField={this.props.showCount}
        handleClick={this.handleListClick}
        status={false}
        ref={"ref" + item.key} />);
    }.bind(this));
    // Build the array of Tags for selected items
    selectedItems.forEach(function (item) {
      TagItemsArray.push(<Tag
        key={item}
        value={item}
        onClick={this.handleTagClick} />);
    }.bind(this));
    return (
      <div>
        {TagItemsArray}
        <div style={Style.divScroll}>
          {ListItemsArray}
        </div>
      </div>
    );
  }
}

class ListItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: this.props.status || false,
    };
  }
  handleClick() {
    this.setState({
      status: !this.state.status
    });
    this.props.handleClick(this.props.value, !this.state.status);
  }
  handleCheckboxChange(event) {
    this.setState({
      status: event.target.checked
    });
  }
  render() {
    let count;
    // Check if the user has set to display countField 
    if (this.props.countField) {
      count = <label> ({this.props.doc_count}) </label>;
    }
    return (
      <div onClick={this.handleClick.bind(this) } style={Style.divListItem}>
        <input type="checkbox"
          checked={this.state.status}
          onChange={this.handleCheckboxChange.bind(this) } />
        <label >{this.props.value}</label>
        {count}
      </div>
    );
  }
}

class Tag extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <span onClick={this.props.onClick.bind(null, this.props.value) } style={Style.divListTag}>
        <span>{this.props.value}</span>
        <span><b>&nbsp; x</b></span>
      </span>
    );
  }
}