import { default as React, Component } from 'react';
import { render } from 'react-dom';
import { GoogleMapLoader, GoogleMap, Marker, SearchBox } from "react-google-maps";
import InfoBox from 'react-google-maps/lib/addons/InfoBox';
import { default as MarkerClusterer } from "react-google-maps/lib/addons/MarkerClusterer";
import {queryObject, emitter} from './ImmutableQuery.js';
import {AppbaseSearch} from './AppbaseSearch';
var helper = require('./helper.js');
var Style = require('./Style.js');

export class AppbaseMap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      markers: [],
      selectedMarker: null,
      streamingStatus: 'Intializing..',
      center: this.props.defaultCenter,
      query: {}
    }
    var streamingInstance;
    this.handleSearch = this.handleSearch.bind(this);
  }
  componentDidMount() {
    var self = this;
    // Listen to change in the query
    emitter.addListener('change', function (query) {
      self.setState({
        query: query
      }, function () {
        // Get the new markers when the query has changed
        self.getNewMarkers();
      });
    });
  };

  getNewMarkers() {
    var self = this;
    // Check if user has requested Historical data, then fetch from Appbase
    if (this.props.historicalData == true) {
      var reqObject = this.state.query
      // Delete aggs part of the request as it will be irrelevant for Map query
      delete reqObject.body.aggs;
      helper.appbaseRef.search(reqObject).on('data', function (data) {
        let newMarkersArray = [];
        newMarkersArray = data.hits.hits.map((hit, index) => {
          let position = {
            position: {
              lat: hit._source[self.props.fieldName].lat,
              lng: hit._source[self.props.fieldName].lon
            }
          }
          return (
            <Marker {...position} key={index} zIndex={1}/>
          )
        })
        self.setState({
          markers: newMarkersArray
        }, function () {
          self.startStreaming();
        });
      }).on('error', function (error) {
        console.log(error)
      });
    }
    // else start the realtime streaming
    else {
      this.startStreaming()
    }
  }
  startStreaming() {
    var self = this;
    let query = this.state.query;
    self.setState({
      streamingStatus: 'Listening...'
    });
    // Stop the previous instance of the streaming
    if (this.streamingInstance) {
      this.streamingInstance.stop()
    };
    this.streamingInstance = helper.appbaseRef.searchStream(query).on('data', function (stream) {
      let positionMarker = {
        position: {
          lat: stream._source[self.props.fieldName].lat,
          lng: stream._source[self.props.fieldName].lon
        }
      }
      // Using a different color marker for realtime markers
      let newMarker = <Marker {...positionMarker}
        key={Date.now() }
        icon="images/map.png"
        zIndex={100} />
      let newMarkersArray = self.state.markers;
      // If the marker is deleted, remove it from the map
      if (stream._deleted == true) {
        var deleteIndex = newMarkersArray.indexOf(newMarker);
        newMarkersArray.splice(deleteIndex, 1);
        self.props.onDelete(positionMarker);
      }
      else {
        newMarkersArray.push(newMarker)
        self.props.onIndex(positionMarker);
      }
      self.setState({
        markers: newMarkersArray,
        streamingStatus: 'Listening...'
      });
    }).on('error', function (error) {
      console.log(error)
    });
  }
  // Handle function which is fired when map is moved and reaches to idle position
  handleOnIdle() {
    var mapBounds = this.refs.map.getBounds();
    var north = mapBounds.getNorthEast().lat();
    var south = mapBounds.getSouthWest().lat();
    var east = mapBounds.getNorthEast().lng();
    var west = mapBounds.getSouthWest().lng();
    var boundingBoxCoordinates = {
      "top_left": [west, north],
      "bottom_right": [east, south]
    }
    var query = queryObject.updateGeoFilter(this.props.fieldName, boundingBoxCoordinates)
    this.setState({
      streamingStatus: 'Fetching...'
    });
    // Get the new bounds of the map
    this.setState({
      query: query
    }, function () {
      this.getNewMarkers();
    });
  }
  // Handler function for bounds changed which udpates the map center
  handleBoundsChanged() {
    this.setState({
      center: this.refs.map.getCenter()
    });
  }
  // Handler function which is fired when an input is selected from autocomplete google places 
  handlePlacesChanged() {
    const places = this.refs.searchBox.getPlaces();
    this.setState({
      center: places[0].geometry.location
    });
  }
  // Handler function which is fired when an input is selected from Appbase geo search field
  handleSearch(location) {
    this.setState({
      center: new google.maps.LatLng(location.value.lat, location.value.lon)
    });
  }
  render() {
    var markerComponent, searchComponent;
    let appbaseSearch;
    var searchComponentProps = {};
    if (this.props.markerCluster) {
      markerComponent = <MarkerClusterer averageCenter enableRetinaIcons gridSize={ 60 } >
        {this.state.markers}
      </MarkerClusterer>;
    }
    else {
      markerComponent = this.state.markers;
    }
    if (this.props.searchComponent === "appbase") {
      appbaseSearch = <AppbaseSearch
        fieldName={this.props.searchField}
        config={this.props.config}
        handleSearch={this.handleSearch}
        latField="location.lat"
        lonField="location.lon"
        placeholder="Search location.."
        isGeoSearch={true} />
      searchComponentProps.center = this.state.center;
      searchComponentProps.onBoundsChanged = ::this.handleBoundsChanged;
    } else if (this.props.searchComponent === "google") {
      searchComponent = <SearchBox
        controlPosition={google.maps.ControlPosition.TOP_LEFT}
        onPlacesChanged={:: this.handlePlacesChanged}
        ref = "searchBox"
        placeholder = "Search location"
        style = { Style.inputStyle }
      />;
      searchComponentProps.center = this.state.center;
      searchComponentProps.onBoundsChanged = ::this.handleBoundsChanged;
  }
  return(
    <div style={Style.fullHeightDiv}>
      {appbaseSearch}
      <GoogleMapLoader
        containerElement={
          <div {...this.props} style={Style.fullHeightDiv} />
        }
        googleMapElement={<GoogleMap ref = "map"
          {...searchComponentProps}
          {...this.props}
          onIdle = {:: this.handleOnIdle}>
          {searchComponent}
          {markerComponent}
      </GoogleMap>}/>
      <div style= { Style.divStatusStyle } ref= "status" > { this.state.streamingStatus } </div >
      <div style={Style.divAppbaseStyle} >
        Powered by <img width='200px' height='auto' src="http://slashon.appbase.io/img/Appbase.png" /> 
      </div>                
    </div >
    )
  }
}
AppbaseMap.propTypes = {
  fieldName: React.PropTypes.string.isRequired,
  searchField: React.PropTypes.string,
  searchComponent: React.PropTypes.string,
  onDelete: React.PropTypes.func,
  onIndex: React.PropTypes.func,
  markerCluster: React.PropTypes.bool,
  historicalData: React.PropTypes.bool,
};
AppbaseMap.defaultProps = {
  historicalData: true,
  markerCluster: true,
  searchComponent: "google"
};