
var changeTimespan;

$(document).ready(function() {

  var components = {};

  changeTimespan = function (hours) {
    var now = new Date();
    $.getJSON("/rest/jobs", function(data) {
      var result = [];
      $.each(data, function(index, job) {
        var jobDate = new Date(job.date);
        var delta = Math.abs(now - jobDate) / 1000 / 60 / 60;
        if (delta <= hours) {
          result.push(job);
        }
      });

      var list_printer = [],
        list_label = [];
      var jobcount_by_printer = {};
      var jobcount_by_label = {};
      var printer_name = {};
      var error_count = 0;
      result.forEach(function(job) {
        // how many printer? were used
        if (!list_printer.includes(job.printer_id)) {
          list_printer.push(job.printer_id);
        }
        // how many label? were used
        if (!list_label.includes(job.label_id)) {
          list_label.push(job.label_id);
        }
        //
        if (!jobcount_by_printer[job.printer_id]) {
          jobcount_by_printer[job.printer_id] = {};
          jobcount_by_printer[job.printer_id].count = 0;
          jobcount_by_printer[job.printer_id].name = job.printer_name;
        }
        jobcount_by_printer[job.printer_id].count++;

        if (!jobcount_by_label[job.label_id]) {
          jobcount_by_label[job.label_id] = {};
          jobcount_by_label[job.label_id].count = 0;
          jobcount_by_label[job.label_id].name = job.printer_name;
        }
        jobcount_by_label[job.label_id].count++;

        if (job.failed) {
          error_count++;
        }
      });

      $('#printercount').text(list_printer.length);
      $('#labelcount').text(list_label.length);
      $('#jobcount').text(result.length);
      $('#errorcount').text(error_count);

      var label = [];
      var dat = [];

      for (key in jobcount_by_printer) {
        label.push(jobcount_by_printer[key].name);
        dat.push(jobcount_by_printer[key].count);
      }

      createPieChart("jobcount_by_printer", label, dat);

      //TODO
      label = [];
      dat = [];
      // last 24 hours?
      if (hours == 24) {
        var max = now;
        var min = new Date();
        min.setHours(max.getHours() - hours);
        max.setHours(max.getHours() - (hours-1));
        for (var i = hours-1; i >= 0; i--) {
          label.push(i == 0 ? "now" : -i + " h");
          var count = 0;
          result.forEach(function(job) {
            var jobDate = new Date(job.date);
            if (jobDate >= min && jobDate < max) {
              count++
            }
          });
          dat.push(count);
          max.setHours(max.getHours() + 1);
          min.setHours(min.getHours() + 1);
        }
      } else {
        // daywise
        var max = now;
        var min = new Date();
        min.setHours(max.getHours() - hours);
        max.setHours(max.getHours() - (hours-24));
        for (var i = hours-24; i >= 0; i -= 24) {
          label.push(i == 0 ? "today" : -(i / 24) + " d");
          var count = 0;
          result.forEach(function(job) {
            var jobDate = new Date(job.date);
            if (jobDate >= min && jobDate < max) {
              count++;
            }
          });
          dat.push(count);
          max.setHours(max.getHours() + 24);
          min.setHours(min.getHours() + 24);
        }
      }
      createAreaChart("jobcount_by_time", label, dat, "# of printjobs");

      if (components['#errorTable']) {
        components['#errorTable'].destroy();
      }

      $tbody = $("#errorTable").find("tbody");
      $tbody.html("");

      result.forEach(function(job) {
        if (job.failed) {
          $tbody.append('<tr><td>' + job.printer_name + '</td><td>' + job.label_name + '</td><td>' + (new Date(job.date)) + '</td><td>' + (JSON.stringify(job.error)) + '</td></tr>');
        }
      });

      //
      components['#errorTable'] = $('#errorTable').DataTable();

      // $('.charts').matchHeight(false);

      console.log("Overall", result, " Printer count", list_printer.length, "Label count", list_label.length, jobcount_by_printer);
    });
  }

  changeTimespan(parseInt($('#timespan').data("time")));

  function createPieChart(id, label, data) {
    // Set new default font family and font color to mimic Bootstrap's default styling
    Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontColor = '#858796';

    if (components[id]) {
      components[id].destroy();
    }

    // Pie Chart Example
    var ctx = document.getElementById(id);
    var myPieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: label,
        datasets: [{
          data: data,
          backgroundColor: palette('mpn65', data.length).map(function(hex) {
            return '#' + hex;
          })
          /*
          backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc'],
          hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf'],
          hoverBorderColor: "rgba(234, 236, 244, 1)",
          */
        }],
      },
      options: {
        maintainAspectRatio: false,
        tooltips: {
          backgroundColor: "rgb(255,255,255)",
          bodyFontColor: "#858796",
          borderColor: '#dddfeb',
          borderWidth: 1,
          xPadding: 15,
          yPadding: 15,
          displayColors: false,
          caretPadding: 10,
        },
        legend: {
          display: true,
          position: 'bottom',
          fullWidth: false
        },
        cutoutPercentage: 80,
      },
    });
    components[id] = myPieChart;
  }

  function createAreaChart(id, labels, data, label) {
    // Set new default font family and font color to mimic Bootstrap's default styling
    Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontColor = '#858796';

    function number_format(number, decimals, dec_point, thousands_sep) {
      // *     example: number_format(1234.56, 2, ',', ' ');
      // *     return: '1 234,56'
      number = (number + '').replace(',', '').replace(' ', '');
      var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function(n, prec) {
          var k = Math.pow(10, prec);
          return '' + Math.round(n * k) / k;
        };
      // Fix for IE parseFloat(0.55).toFixed(0) = 0;
      s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
      if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
      }
      if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
      }
      return s.join(dec);
    }

    if (components[id]) {
      components[id].destroy();
    }

    // Area Chart Example
    var ctx = document.getElementById(id);
    var myLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          lineTension: 0.3,
          backgroundColor: "rgba(78, 115, 223, 0.05)",
          borderColor: "rgba(78, 115, 223, 1)",
          pointRadius: 3,
          pointBackgroundColor: "rgba(78, 115, 223, 1)",
          pointBorderColor: "rgba(78, 115, 223, 1)",
          pointHoverRadius: 3,
          pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
          pointHoverBorderColor: "rgba(78, 115, 223, 1)",
          pointHitRadius: 10,
          pointBorderWidth: 2,
          data: data,
        }],
      },
      options: {
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
            right: 25,
            top: 25,
            bottom: 0
          }
        },
        scales: {
          xAxes: [{
            time: {
              unit: 'date'
            },
            gridLines: {
              display: false,
              drawBorder: false
            },
            ticks: {
              maxTicksLimit: 7
            }
          }],
          yAxes: [{
            ticks: {
              maxTicksLimit: 5,
              padding: 10
              /*,
                            // Include a dollar sign in the ticks
                            callback: function(value, index, values) {
                              return '$' + number_format(value);
                            }
                            */
            },
            gridLines: {
              color: "rgb(234, 236, 244)",
              zeroLineColor: "rgb(234, 236, 244)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2]
            }
          }],
        },
        legend: {
          display: false
        },
        tooltips: {
          backgroundColor: "rgb(255,255,255)",
          bodyFontColor: "#858796",
          titleMarginBottom: 10,
          titleFontColor: '#6e707e',
          titleFontSize: 14,
          borderColor: '#dddfeb',
          borderWidth: 1,
          xPadding: 15,
          yPadding: 15,
          displayColors: false,
          intersect: false,
          mode: 'index',
          caretPadding: 10,
          callbacks: {
            label: function(tooltipItem, chart) {
              var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
              return datasetLabel + ': ' + number_format(tooltipItem.yLabel);
            }
          }
        }
      }
    });

    components[id] = myLineChart;
  }

});

// Update Statistics if new Printjob starts
function updateStatistics() {
  var hours = parseInt($('#timespan').data("time"));
  changeTimespan(hours);
}
