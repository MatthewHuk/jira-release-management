import React, { Component } from "react";
import axios from "axios";

import Select from "react-select";
import CreatableSelect from "react-select/lib/Creatable";

import "./Release.css";

const Datetime = require("react-datetime");
const moment = require("moment");
require("moment/locale/en-gb");

class Releases extends Component {
  constructor(props) {
    super(props);

    this.onSubmit = this.onSubmit.bind(this);
    // this.handleReleaseChange = this.handleReleaseChange.bind(this);
    // this.handleIssueChange = this.handleIssueChange.bind(this);
    // this.handleDateChange = this.handleDateChange.bind(this);

    this.state = {
      issueData: [],
      releaseData: [],
      selectedIssue: null,
      selectedRelease: null,
      selectedDate: moment().startOf("day").add(8.5, "hours"),
      isLoading: true
    };
  }

  handleIssueChange = selectedIssue => {
    console.log(selectedIssue);
    this.setState({ selectedIssue: selectedIssue });
    console.log(`Option selected:`, selectedIssue);
  };

  handleReleaseChange = selectedRelease => {
    this.setState({ selectedRelease: selectedRelease });
    console.log(`Option selected:`, selectedRelease);
  };

  handleDateChange = selectedDate => {
    this.setState({ selectedDate });
    console.log(`Date selected:`, selectedDate);
  };

  async componentDidMount() {
    const issues = (await axios.get("http://localhost:5001/issues-in-sprint"))
      .data;
    const releases = (await axios.get("http://localhost:5001/releases")).data;

    //console.log(releases); console.log(issues);
    this.setState({
      issueData: issues,
      releaseData: releases,
      isLoading: false
    });
  }

  async onSubmit(e) {
    e.preventDefault();
    console.log(`selected release is ${this.state.selectedRelease} and selected issue is ${this.state.selectedIssue}  and date is ${this.state.selectedDate}`);

    const result = await axios.post("http://localhost:5001/create-release", {
      release: this.state.selectedRelease,
      issues: this.state.selectedIssue,
      date: this.state.selectedDate
    });

    console.log(result);
  }

  render() {
    return (
      <div className="container">
        <h3>Add New Release</h3>

        <form onSubmit={this.onSubmit}>
          <div className="row">
            <div className="col-md-4">
              <div className="form-group">
                <Datetime
                  value={this.state.selectedDate}
                  onChange={this.handleDateChange}
                  utc={true}
                  closeOnSelect={true}
                />
              </div>
            </div>

            <div className="col-md-4">
              <div className="form-group">
                <CreatableSelect
                  isMulti
                  aria-labelledby="issue key"
                  isLoading={this.state.isLoading}
                  onChange={this.handleIssueChange}
                  options={this.state.issueData}
                  value={this.state.selectedIssue}
                  className="basic-multi-select"
                  classNamePrefix="select"
                />
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-group">
                <Select
                  aria-labelledby="release key"
                  isLoading={this.state.isLoading}
                  onChange={this.handleReleaseChange}
                  options={this.state.releaseData}
                  value={this.state.selectedRelease}
                  autoFocus
                  blurInputOnSelect
                />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="form-group">
              <input
                type="submit"
                value="Add release"
                disabled={
                  !this.state.selectedRelease ||
                  !this.state.selectedDate ||
                  !this.state.selectedIssue
                }
                className="btn btn-primary"
              />
            </div>
          </div>
        </form>
      </div>
    );
  }
}

export default Releases;
