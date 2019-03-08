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
    //this.handleCommentsChange = this.handleCommentsChange.bind(this);

    this.state = {
      issueData: [],
      releaseData: [],
      selectedIssue: null,
      selectedRelease: null,
      selectedDate: moment().startOf("day").add(9, "hours"),
      comments: '',
      isLoading: true,
      error:null
    };
  }

  handleCommentsChange = enteredComment => {
    this.setState({ comments: enteredComment.target.value });
    console.log(`Comments:`, enteredComment.target.value);
  };

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

    try{

    const issues = (await axios.get("http://localhost:5001/issues-in-sprint")).data;
    const releases = (await axios.get("http://localhost:5001/releases")).data;

    //console.log(releases); console.log(issues);
    this.setState({
      issueData: issues,
      releaseData: releases,
      isLoading: false
    });

    } catch(err) {
     console.log(err)
      let e = (err.response) ? err.response.data : err;
      this.setState({error: e.error})    }
}

  async onSubmit(event) {
    event.preventDefault();
    console.log(`selected release is ${this.state.selectedRelease} and selected issue is ${this.state.selectedIssue}  and date is ${this.state.selectedDate} and comments ${this.state.comments}`);

    try{

      this.setState({error: null}) // Clear previous error

      const result = await axios.post("http://localhost:5001/create-release", {
        release: this.state.selectedRelease,
        issues: this.state.selectedIssue,
        date: this.state.selectedDate,
        comments: this.state.comments
      });
      
      // Clear input to prevent multiple clicks by mistake
      // this.setState({
      //   selectedRelease: undefined,
      // });

      console.log(result);

    } catch(err) {
      
      let e = (err.response) ? err.response.data : err;
      this.setState({error: e.error})
    }
    
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
          <div className="col-md-12">
            <div className="form-group">
            {/* <label htmlFor="comments">CI build and comments</label> */}
                <textarea className="form-control" id="comments" placeholder="CI build and any extra info" rows="3" onChange={this.handleCommentsChange} value={this.state.comments}></textarea>
              </div>
            </div>
          </div>
          <div className="row">
          <div className="col-md-4">
            <div className="form-group">
              <input
                type="submit"
                value="Add release"
                disabled={
                  !this.state.selectedRelease ||
                  !this.state.selectedDate ||
                  !this.state.comments ||
                  !(this.state.selectedIssue && this.state.selectedIssue.length > 0)
                }
                className="btn btn-primary"
              />
              </div>
            </div>
          </div>
          <div className="Row">
            <div className="col-md-12">
              <div className="form-group">
                <div className={this.state.error ? "alert alert-danger" : "halert alert-danger hidden"} >
                    <span>{this.state.error}</span>
                </div>
              </div>
            </div>
          </div>       
        </form>
      </div>
    );
  }
}

export default Releases;
