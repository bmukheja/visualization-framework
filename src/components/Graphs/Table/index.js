import React from 'react'
import DataTables from 'material-ui-datatables'
import AbstractGraph from "../AbstractGraph"
import columnAccessor from "../../../utils/columnAccessor"
import CopyToClipboard from 'react-copy-to-clipboard'
import {Tooltip} from 'react-lightweight-tooltip'
import * as d3 from 'd3'

import tooltipStyle from './tooltipStyle'
import "./style.css"
import style from './style'
import {properties} from "./default.config"

import SearchBar from "../../SearchBar"

export default class Table extends AbstractGraph {

    constructor(props, context) {
        super(props, properties)

        this.handleSortOrderChange   = this.handleSortOrderChange.bind(this)
        this.handlePreviousPageClick = this.handlePreviousPageClick.bind(this)
        this.handleNextPageClick     = this.handleNextPageClick.bind(this)
        this.handleClick             = this.handleClick.bind(this)
        this.handleSearch            = this.handleSearch.bind(this)
        this.handleRowSelection      = this.handleRowSelection.bind(this)
        this.handleContextMenu       = this.handleContextMenu.bind(this)

        /**
        */
        this.currentPage = 1
        this.filterData = false
        this.selectedRows = {}
        this.htmlData = {}
        this.state = {
            selected: [],
            data: [],
            fontSize: style.defaultFontsize
        }
    }

    componentWillMount() {
        this.initiate();
    }

    componentWillReceiveProps(nextProps) {
        if(this.props !== nextProps) {
            this.initiate();
        }
    }

    componentDidUpdate() {
        this.checkFontsize();
    }

    initiate() {
        let columns = this.getColumns();

        if (!columns)
            return;

        /*
         * On data change, resetting the paging and filtered data to 1 and false respectively.
         */
        this.resetFilters();

        this.filterData = this.props.data;
        this.setHeaderData(columns);
        this.updateData();
    }   

    decrementFontSize() {
        this.setState({
            fontSize: this.state.fontSize - 1
        })
    }

    checkFontsize() {
        if(this.container.querySelector('table').clientWidth > this.container.clientWidth) {
            this.decrementFontSize();
        }
    }

    resetFilters() {
        this.currentPage = 1;
        this.selectedRows = {};
    }

    handleSearch(data) {
        this.resetFilters();

        this.filterData = data;
        this.updateData();
    }

    updateData() {
        const {
            limit,
        } = this.getConfiguredProperties();

        let offset = limit * (this.currentPage - 1);

        this.setState({
            data : this.filterData.slice(offset, offset + limit),
            selected: this.selectedRows[this.currentPage] ? this.selectedRows[this.currentPage]: []
        });
    }

    getColumns() {
        const {
            data,
            configuration,
        } = this.props;

        if (!data || !data.length)
            return;

        return configuration.data.columns;
    }

    getAccessor(columns) {
        return columns.map(columnAccessor);
    }

    getTooltipAccessor(columns) {
        return columns.map(column => {
            return column.tooltip ? columnAccessor(column.tooltip) : () => {}
        });
    }

    setHeaderData(columns) {
        this.headerData = columns.map(({column, label}, i) => ({
            key: column,
            label: label || column,
            sortable: true,
            columnText: label || column,
            columField: column,
            type:"text",
            style: {
              textIndent: '2px'
            }
           }
        ));
    }

    getHeaderData() {
        return this.headerData;
    }

    getTableData(columns) {
        const {
            highlight,
            highlightColor
        } = this.getConfiguredProperties();
        const accessors = this.getAccessor(columns);
        const tooltipAccessor = this.getTooltipAccessor(columns);

        return this.state.data.map((d, j) => {

            let data = {},
                highlighter = false;

            accessors.forEach((accessor, i) => {
                let originalData = accessor(d),
                    columnData   = originalData

                if(columns[i].tooltip) {
                    let fullText = tooltipAccessor[i](d, true);
                    columnData = <div>
                            <Tooltip key={`tooltip_${j}_${i}`}
                              content={
                                [
                                  fullText,
                                  <CopyToClipboard text={fullText}><button title="copy" className="btn btn-link btn-xs fa fa-copy pointer text-white"></button></CopyToClipboard>,
                                ]
                              }
                              styles={tooltipStyle}>
                              <a className="pointer">
                                 {columnData}
                              </a>
                            </Tooltip>
                        </div>
                }

                if(highlight && highlight.includes(columns[i].column) && originalData) {
                    highlighter = true
                }

                data[columns[i].column] = columnData;
            });

            if(highlighter)
               Object.keys(data).map( key => {
                return data[key] = <div style={{background: highlightColor, height: style.row.height, padding: "10px 0"}}>{data[key]}</div>
            })

            return data
        })
    }

    handleSortOrderChange(column, order) {
        const keys = column.split(".");
        const value = (d) => keys.reduce((d, key) => d[key], d);

        this.filterData = this.filterData.sort(
          (a, b) => {
            return order === 'desc' ? value(b) > value(a) : value(a) > value(b);
          }
        );

        /**
         * Resetting the paging due to sorting
         */
        this.resetFilters();
        this.updateData();
    }

    handlePreviousPageClick() {
        --this.currentPage;
        this.updateData();
    }

    handleNextPageClick() {
        ++this.currentPage;
        this.updateData();
    }

    handleClick(key) {
        if(this.props.onMarkClick && this.state.data[key])
           this.props.onMarkClick(this.state.data[key]);
    }

    handleRowSelection(selectedRows) {
        const {
            multiSelectable
        } = this.getConfiguredProperties();

        if(!multiSelectable) {
            this.handleClick(...selectedRows)
        } else {
            this.selectedRows[this.currentPage] = selectedRows.slice();
            this.setState({
                selected: this.selectedRows[this.currentPage]
            })
        }
    }

    handleContextMenu(event) {
        event.preventDefault()
        const selectedRows = this.getSelectedRows()
        return false
    }

    getSelectedRows() {
        const {
            limit
        } = this.getConfiguredProperties();

        let selected = [];
        for(let page in this.selectedRows) {
            if(this.selectedRows.hasOwnProperty(page)) {
                this.selectedRows[page].forEach((index) => {
                    selected.push(this.filterData[(page - 1) * limit + index])
                })
            }
        }
        return selected;
    }
    

    renderSearchBarIfNeeded(showHeader) {
        const {
            searchBar
        } = this.getConfiguredProperties();

        if(searchBar === false || !showHeader)
           return;

        return (
          <SearchBar
            data={this.props.data}
            options={this.getHeaderData()}
            handleSearch={this.handleSearch}
            columns={this.getColumns()}
          />
        );
    }

    removeHighlighter(data) {
        const {
            highlight
        } = this.getConfiguredProperties();

        if(highlight) {
            this.state.selected.map( (key) => {
                if(highlight && data[key]) {
                    for (let i in data[key]) {
                        if (data[key].hasOwnProperty(i)) {
                            if(data[key][i].props.style)
                                data[key][i].props.style.background = ''
                        }
                    }
                }
            })
        }
        return data
    }

    render() {
        const {
            height,
        } = this.props;

        const {
            limit,
            selectable,
            multiSelectable,
            showCheckboxes,
            hidePagination
        } = this.getConfiguredProperties();

        let tableData = this.getTableData(this.getColumns())

        // overrite style of highlighted selected row
        tableData = this.removeHighlighter(tableData)


        if(!tableData) {
            return "<p>No Data</p>";
        }

        let showHeader = (this.filterData && this.filterData.length <= limit && hidePagination !== false) ? false : true,
          tableHeight  = showHeader ? `${height - 100}px` : height

        return (
            <div ref={(input) => { this.container = input; }}
                onContextMenu={this.handleContextMenu}
                >
                {this.renderSearchBarIfNeeded(showHeader)}
                <DataTables
                    columns={this.getHeaderData()}
                    data={tableData}
                    showHeaderToolbar={false}
                    showFooterToolbar={showHeader}
                    selectable={selectable}
                    multiSelectable={multiSelectable}
                    selectedRows={this.state.selected}
                    showCheckboxes={showCheckboxes}
                    showRowSizeControls={false}
                    onNextPageClick={this.handleNextPageClick}
                    onPreviousPageClick={this.handlePreviousPageClick}
                    onSortOrderChange={this.handleSortOrderChange}
                    onRowSelection={this.handleRowSelection}
                    page={this.currentPage}
                    count={this.filterData.length}
                    onCellClick={this.handleClick}
                    rowSize={limit}
                    tableStyle={style.table}
                    tableHeaderColumnStyle={Object.assign({}, style.headerColumn, {fontSize: this.state.fontSize})}
                    tableRowStyle={style.row}
                    tableRowColumnStyle={Object.assign({}, style.rowColumn, {fontSize: this.state.fontSize})}
                    tableBodyStyle={Object.assign({}, style.body, {height: tableHeight})}
                    footerToolbarStyle={style.footerToolbar}
                />
            </div>
        );
    }
}

Table.propTypes = {
  configuration: React.PropTypes.object,
  response: React.PropTypes.object
};
