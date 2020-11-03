
            // Load the Visualization API and the controls package.
            google.charts.load('47', { 'packages': ['corechart', 'controls', 'table'] });
            // Set a callback to run when the Google Visualization API is loaded.
            google.charts.setOnLoadCallback(globalChart);

            //Static Table Options
            var table_options = {
                sortColumn: 2,
                sortAscending: true,
                allowHtml: true
            }

            //This function grabs the raw data from the google sheets
            function globalChart() {

                // Create table and chart
                table = new google.visualization.Table(document.getElementById('table_div'));
                line_chart = new google.visualization.LineChart(document.getElementById('line_chart_div'));

                //Grab sheets data
                var queryString = encodeURIComponent("SELECT*");

                var query = new google.visualization.Query(
                    'https://docs.google.com/spreadsheets/d/1eABM4-XgHerB98VjVo1kVvcAl6ocGPCstMQs4bh5WEA/gviz/tq?sheet=ETF_FV_DB&headers=1&tq=' + queryString);
                query.send(handleSampleDataQueryResponse);

                function handleSampleDataQueryResponse(response) {

                    if (response.isError()) {
                        alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
                        return;
                    }

                    //convert data to array
                    timeseries_raw = response.getDataTable();

                    //Draw the intial table and charts - globalChart() will not be called again when user inputs change
                    tableEXE();
                }

            }

            function buttonReset() {
                row_select = [];
                tableEXE();
            }

            //This function loads the google charts package and triggers the drawChart() function
            function tableEXE() {
                google.charts.setOnLoadCallback(drawTable);
            }

            function chartEXE() {
                google.charts.setOnLoadCallback(drawChart);
            }

            //This function draws the google table
            function drawTable() {

                value_metric = document.getElementById('value_metric').value

                //Create clone of data
                data_clone = timeseries_raw.clone();

                //Remove unused columns from data_clone, leave column 0 (dates) included
                for (i = data_clone.getNumberOfColumns() - 1; i > 0; i--) {
                    var desc = data_clone.getColumnLabel(i).split(",")[2]
                    var metric = data_clone.getColumnLabel(i).split(",")[3]
                    //Eventually allow user to compare by sector/geography etc.?
                    if (!(metric === value_metric)) {
                        data_clone.removeColumn(i)
                    }
                }

                //Create view of data clone
                view = new google.visualization.DataView(data_clone);

                //Draw table and then chart
                var table_data = new google.visualization.DataTable();
                table_data.addColumn('string', 'ETF Ticker');
                table_data.addColumn('string', 'Name');
                //Eventually make P/E label dynamic based on user selection
                table_data.addColumn('number', 'Current vs. 5yr Ave');
                table_data.addColumn('number', 'Current ' + value_metric);
                table_data.addColumn('number', '6 Month Ave');
                table_data.addColumn('number', '1 Year Ave');
                table_data.addColumn('number', '3 Year Ave');
                table_data.addColumn('number', '5 Year Ave');

                var rowcount = view.getNumberOfRows() - 1;

                function periodAVG(start_date, index) {
                    var rows = view.getFilteredRows([{ column: 0, minValue: start_date }])
                    var count = 0
                    var total = 0
                    for (jj = 0; jj < rows.length; jj++) {
                        total = total + view.getValue(rows[jj], index)
                        count = count + 1
                    }
                    return total / count
                }

                for (i = 1; i < view.getNumberOfColumns(); i++) {
                    var index = i
                    table_data.addRow(
                        [
                            view.getColumnLabel(index).split(",")[0],
                            view.getColumnLabel(index).split(",")[1],
                            (view.getValue(view.getNumberOfRows() - 1, index) / periodAVG(minDate(1825), index) - 1) * 100,
                            view.getValue(view.getNumberOfRows() - 1, index),
                            periodAVG(minDate(180), index),
                            periodAVG(minDate(365), index),
                            periodAVG(minDate(1095), index),
                            periodAVG(minDate(1825), index)
                        ]
                    )
                }

                //Draw table and sort by 1 month performance
                var formatter = new google.visualization.NumberFormat(
                    { negativeColor: "red", negativeParens: true });
                var formatter1 = new google.visualization.NumberFormat(
                    { suffix: '%', negativeColor: "red", negativeParens: true });
                formatter1.format(table_data, 2);
                formatter.format(table_data, 3);
                formatter.format(table_data, 4);
                formatter.format(table_data, 5);
                formatter.format(table_data, 6);
                formatter.format(table_data, 7);
                table.draw(table_data, table_options)

                //Event listener to show single stock on chart
                google.visualization.events.addListener(table, 'select', selectHandler1);
                function selectHandler1() {
                    if (typeof table.getSelection()[0] != 'undefined') {
                        if (!row_select.includes(table.getSelection()[0].row + 1)) {
                            row_select.push(table.getSelection()[0].row + 1)
                        }
                    }
                    drawChart();
                }

                //Replace column headers with just the index names.
                for (k = 1; k < data_clone.getNumberOfColumns(); k++) {
                    data_clone.setColumnLabel(k, data_clone.getColumnLabel(k).split(",")[0])
                }

                //Run chart function
                drawChart();

            }

            //Global variable
            var row_select = [];


            function drawChart() {

                var Start_Year = document.getElementById('Start_Year_Var').value
                var Start_Date = new Date(Start_Year, 0, 1)

                timeseries_normal = data_clone.clone()

                //Need to index data if selected
                if (document.getElementById('scale_metric').value === 'Index') {
                    //Normalize the data to 100
                    var lastRemoval = timeseries_normal.getFilteredRows([{ column: 0, minValue: Start_Date }])[0]
                    timeseries_normal.removeRows(0, lastRemoval)
                    //Now loop through dataset and index each timeseries to 100
                    for (ii = 1; ii < timeseries_normal.getNumberOfColumns(); ii++) {
                        var indexValue = timeseries_normal.getValue(0, ii)
                        //Loop through every column value and normalize to indexValue
                        for (jj = 0; jj < timeseries_normal.getNumberOfRows(); jj++) {
                            var newValue = timeseries_normal.getValue(jj, ii) / indexValue * 100
                            timeseries_normal.setValue(jj, ii, newValue)
                            timeseries_normal.setFormattedValue(jj, ii, null)
                        }
                    }
                }

                var chart_view = new google.visualization.DataView(timeseries_normal);

                if (row_select.length > 0) {
                    var showCols = [0]
                    for (ii = 0; ii < row_select.length; ii++) {
                        showCols.push(row_select[ii])
                    }
                    chart_view.setColumns(showCols)
                }

                chart_view.setRows(chart_view.getFilteredRows([{ column: 0, minValue: Start_Date }]))

                //Chart Options
                var chart_options = {
                    title: 'ETF Valuation',
                    legend: 'bottom',
                    vAxis: {
                        viewWindowMode: 'maximized',
                        title: value_metric
                    }
                }

                //Draw chart
                line_chart.draw(chart_view, chart_options)

            }

            //Function for date filtering
            var minDate = function (period) {
                var d = new Date();
                d.setDate(d.getDate() - period + 1);
                d = new Date(d.getFullYear(), d.getMonth(), d.getDate())
                return d;
            }
            //Function for getting YTD
            var YTD = function () {
                var d = new Date();
                d.setDate(d.getDate());
                d = new Date(d.getFullYear(), 0, 1)
                return d;
            }
