import Foundation from "@expo/vector-icons/Foundation";
import { View, Text, StyleSheet, Dimensions } from "react-native";
// import {
//   LineChart,
//   BarChart,
//   PieChart,
//   ProgressChart,
//   ContributionGraph,
//   StackedBarChart,
// } from "react-native-chart-kit";
import * as Progress from 'react-native-progress';
const Statistic = () => {
  const data = {
    labels: ["Exercise", "Work", ""], // optional
    data: [0.4, 0.6, 0.8],
  };
  const chartConfig = {
    backgroundColor: "#e26a00",
    backgroundGradientFrom: "#fb8c00",
    backgroundGradientTo: "#ffa726",
    decimalPlaces: 2, // optional, defaults to 2dp
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726"
    }
  }
  const screenWidth = Dimensions.get("window").width;
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Progress Tracker </Text>
      <View>
        {/* style={{ flexDirection: "row", justifyContent: "space-between" }} */}
        <Text style={{ margin: 15 }}>Today's Score</Text>
        <Progress.Bar  progress={0.4} size={screenWidth} />
        {/* <ProgressChart
          data={data}
          width={screenWidth}
          height={220}
          strokeWidth={16}
          radius={32}
          chartConfig={chartConfig}
          hideLegend={false}
        /> */}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
});

export default Statistic;
