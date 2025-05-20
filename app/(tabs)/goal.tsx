// import React, { useState } from 'react';
// import { View, StyleSheet, ScrollView } from 'react-native';
// import { DataTable, Button, TextInput, Dialog, Portal, Chip, List, Text, Divider } from 'react-native-paper';
// import DateTimePicker from '@react-native-community/datetimepicker';

// // 临时数据存储
// const initialGoals = [
//   {
//     id: '1',
//     title: 'Learn React Native',
//     priority: 1,
//     tags: ['mobile', 'development'],
//     type: 'learning',
//     time: new Date(),
//     tasks: ['Setup environment', 'Create first app'],
//     children: []
//   }
// ];

// export default function GoalPage() {
//   const [goals, setGoals] = useState(initialGoals);
//   const [dialogVisible, setDialogVisible] = useState(false);
//   const [editingGoal, setEditingGoal] = useState(null);
//   const [date, setDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [formData, setFormData] = useState({
//     title: '',
//     priority: '1',
//     tags: [],
//     type: 'personal',
//     newTag: ''
//   });

//   const showDialog = (goal = null) => {
//     setEditingGoal(goal);
//     setFormData(goal ? { ...goal } : {
//       title: '',
//       priority: '1',
//       tags: [],
//       type: 'personal',
//       newTag: ''
//     });
//     setDialogVisible(true);
//   };

//   const handleSubmit = () => {
//     if (editingGoal) {
//       // 更新逻辑
//       setGoals(goals.map(g => g.id === editingGoal.id ? formData : g));
//     } else {
//       // 创建逻辑
//       const newGoal = {
//         ...formData,
//         id: String(goals.length + 1),
//         time: date,
//         tasks: [],
//         children: []
//       };
//       setGoals([...goals, newGoal]);
//     }
//     setDialogVisible(false);
//   };

//   const deleteGoal = (id) => {
//     setGoals(goals.filter(g => g.id !== id));
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView>
//         <DataTable>
//           <DataTable.Header>
//             <DataTable.Title>Title</DataTable.Title>
//             <DataTable.Title numeric>Priority</DataTable.Title>
//             <DataTable.Title numeric>Type</DataTable.Title>
//             <DataTable.Title numeric>Actions</DataTable.Title>
//           </DataTable.Header>

//           {goals.map((goal) => (
//             <List.Accordion
//               key={goal.id}
//               title={goal.title}
//               left={props => <List.Icon {...props} icon="flag" />}
//             >
//               <List.Item
//                 title={`Priority: ${goal.priority}`}
//                 left={() => <List.Icon icon="priority-high" />}
//               />
//               <List.Item
//                 title={`Type: ${goal.type}`}
//                 left={() => <List.Icon icon="format-list-bulleted-type" />}
//               />
//               <List.Item
//                 title={`Tags: ${goal.tags.join(', ')}`}
//                 left={() => <List.Icon icon="tag-multiple" />}
//               />
//               <View style={styles.buttonGroup}>
//                 <Button mode="contained" onPress={() => showDialog(goal)}>
//                   Edit
//                 </Button>
//                 <Button mode="outlined" onPress={() => deleteGoal(goal.id)}>
//                   Delete
//                 </Button>
//               </View>
//             </List.Accordion>
//           ))}
//         </DataTable>

//         <Button 
//           mode="contained" 
//           style={styles.addButton}
//           onPress={() => showDialog()}
//         >
//           Add New Goal
//         </Button>

//         <Portal>
//           <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
//             <Dialog.Title>
//               {editingGoal ? 'Edit Goal' : 'New Goal'}
//             </Dialog.Title>
//             <Dialog.Content>
//               <TextInput
//                 label="Title"
//                 value={formData.title}
//                 onChangeText={text => setFormData({ ...formData, title: text })}
//                 style={styles.input}
//               />

//               <TextInput
//                 label="Priority"
//                 value={formData.priority}
//                 onChangeText={text => setFormData({ ...formData, priority: text })}
//                 keyboardType="numeric"
//                 style={styles.input}
//               />

//               <TextInput
//                 label="Type"
//                 value={formData.type}
//                 onChangeText={text => setFormData({ ...formData, type: text })}
//                 style={styles.input}
//               />

//               <View style={styles.tagContainer}>
//                 {formData.tags.map((tag, index) => (
//                   <Chip
//                     key={index}
//                     onClose={() => setFormData({
//                       ...formData,
//                       tags: formData.tags.filter(t => t !== tag)
//                     })}
//                     style={styles.chip}
//                   >
//                     {tag}
//                   </Chip>
//                 ))}
//                 <TextInput
//                   placeholder="Add tag"
//                   value={formData.newTag}
//                   onChangeText={text => setFormData({ ...formData, newTag: text })}
//                   onSubmitEditing={() => {
//                     if (formData.newTag.trim()) {
//                       setFormData({
//                         ...formData,
//                         tags: [...formData.tags, formData.newTag.trim()],
//                         newTag: ''
//                       });
//                     }
//                   }}
//                   style={styles.tagInput}
//                 />
//               </View>

//               <Button onPress={() => setShowDatePicker(true)}>
//                 {date.toLocaleDateString()}
//               </Button>
//               {showDatePicker && (
//                 <DateTimePicker
//                   value={date}
//                   mode="date"
//                   onChange={(_, selectedDate) => {
//                     setShowDatePicker(false);
//                     selectedDate && setDate(selectedDate);
//                   }}
//                 />
//               )}
//             </Dialog.Content>
//             <Dialog.Actions>
//               <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
//               <Button onPress={handleSubmit}>Save</Button>
//             </Dialog.Actions>
//           </Dialog>
//         </Portal>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 16,
//     backgroundColor: '#f5f5f5'
//   },
//   addButton: {
//     marginTop: 16
//   },
//   input: {
//     marginBottom: 12
//   },
//   buttonGroup: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     padding: 8
//   },
//   tagContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     alignItems: 'center',
//     marginBottom: 12
//   },
//   chip: {
//     margin: 4
//   },
//   tagInput: {
//     flex: 1,
//     minWidth: 100
//   }
// });