import { default as React, Component } from 'react'
import { render } from 'react-dom'
import { GoogleMapLoader, GoogleMap, Marker, SearchBox } from "react-google-maps"
import InfoBox from 'react-google-maps/lib/addons/InfoBox'
import { default as MarkerClusterer } from "react-google-maps/lib/addons/MarkerClusterer";
var Appbase = require('appbase-js');
var helper = require('./helper.js')
var Style = require('./Style.js')
export class AppbaseMap extends Component {

    constructor(props) {
        super(props)
        this.state = {
            markers: [],
            selectedMarker: null,
            streamingStatus: 'Intializing..',
            center: this.props.defaultCenter
        }
        this.appbaseRef = helper.getAppbaseRef(this.props.config);
        this.streamingInstance;
    }

    startStreaming(boundingBoxCoordinates) {
        var requestObject = helper.getRequestObject(this.props.config, this.props.fieldName, boundingBoxCoordinates, true);   
        var self = this;
        
        self.setState({
            streamingStatus: 'Listening...'
        });
        if(this.streamingInstance){
          this.streamingInstance.stop()
        }
        this.streamingInstance = this.appbaseRef.searchStream(requestObject).on('data', function (stream) {
            console.log(stream)
            let positionMarker = {
                position: { lat: stream._source[self.props.fieldName].lat, lng: stream._source[self.props.fieldName].lon }
            }
            let newMarker = <Marker {...positionMarker} key={Date.now()} icon="images/map.png" zIndex={100} />
            let newMarkersArray = self.state.markers;
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

    getNewMarkers(boundingBoxCoordinates) {
        var requestObject = helper.getRequestObject(this.props.config, this.props.fieldName, boundingBoxCoordinates);
        var self = this;

        if (this.props.historicalData == true) {
            this.appbaseRef.search(requestObject).on('data', function (data) {
                let newMarkersArray = [];
                newMarkersArray = data.hits.hits.map((hit, index) => {
                   let position = {
                       position: { lat: hit._source[self.props.fieldName].lat, lng: hit._source[self.props.fieldName].lon }
                   }
                   return (
                      <Marker {...position} key={index} zIndex={1}/>
                   )
                })
                self.setState({
                    markers: newMarkersArray
                }, function () {
                    self.startStreaming(boundingBoxCoordinates);
                });
            }).on('error', function (error) {
                console.log(error)
            });
        }
        else {
            this.startStreaming(boundingBoxCoordinates)
        }
    }

    handleOnIdle() {
        this.setState({
            streamingStatus: 'Fetching...'
        });
        var mapBounds = this.refs.map.getBounds();
        var north = mapBounds.getNorthEast().lat();
        var south = mapBounds.getSouthWest().lat();
        var east = mapBounds.getNorthEast().lng();
        var west = mapBounds.getSouthWest().lng();
        var boundingBoxCoordinates = {
            "top_left": [west, north],
            "bottom_right": [east, south]
        }
        this.getNewMarkers(boundingBoxCoordinates);
    }
    handleBoundsChanged() {
        this.setState({
            center: this.refs.map.getCenter()
        });
    }
    handlePlacesChanged() {
        const places = this.refs.searchBox.getPlaces();
        this.setState({
            center: places[0].geometry.location
        });
    }

    render() {
        var markerComponent, searchComponent;
        var searchComponentProps = {};
        if (this.props.markerCluster) {
            markerComponent = <MarkerClusterer averageCenter enableRetinaIcons gridSize={ 60 } >
                {this.state.markers}
            </MarkerClusterer>
        }
        else {
            markerComponent = this.state.markers
        }

        if(this.props.searchComponent){
            searchComponent = <SearchBox
                controlPosition={google.maps.ControlPosition.TOP_LEFT}
                onPlacesChanged={:: this.handlePlacesChanged}
                ref="searchBox"
                placeholder="Search location"
                style={Style.inputStyle}
            />
            searchComponentProps.center = this.state.center;
            searchComponentProps.onBoundsChanged = ::this.handleBoundsChanged;
        }
        return (
            <section style={{ height: "100%" }}>
                <GoogleMapLoader
                    containerElement={
                        <div {...this.props} style={{ height: "100%" }} />
                    }
                    googleMapElement={
                        <GoogleMap ref = "map"
                            {...searchComponentProps}
                            {...this.props}
                            onIdle = {:: this.handleOnIdle}>
                            {searchComponent}
                            {markerComponent}
                        </GoogleMap>
                    }
                />
                <div style={Style.divStatusStyle} ref="status" > {this.state.streamingStatus} </div>
                <div style={Style.divAppbaseStyle} > Powered by<img width='200px' height='auto' src="http://slashon.appbase.io/img/Appbase.png" /> </div>                
            </section >
        )
    }

}

AppbaseMap.defaultProps = {
    historicalData: true,
    markerCluster: true,
    searchComponent: false
};