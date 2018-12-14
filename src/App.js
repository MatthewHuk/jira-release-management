import React, { Component } from 'react';
//import './App.css';
import Release from './Release';

const moment = require('moment');
const Datetime = require('react-datetime');

class App extends Component {
  render() {
    return (
      <div>
         <Release />
      </div>
    );
  }
}

export default App;