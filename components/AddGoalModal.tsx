                <View style={styles.modalView}>
                  <ScrollView
                    ref={scrollViewRef}
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingBottom: 20,
                    }}
                  >
                    <Text style={styles.modalTitle} >Add New Task</Text>

                    {/* Task Name Input */}
                    <TextInput
                      style={styles.input}
                      placeholder="Task Name (e.g. Read a book)"
                      value={newTaskName}
                      onChangeText={setNewTaskName}
                      maxLength={40}
                      autoCapitalize="sentences"
                      onFocus={() => {
                        setShowStartTimePicker(false);
                        setShowEndTimePicker(false);
                        setShowEventPicker(false);
                      }}
                    />

                    {/* Start Time - 无论 More 是否展开都显示，且受 scheduled 类型控制 */}
                    {(!showMoreFields) && (
                      <View style={styles.dateTimeContainer} pointerEvents="box-none">
                        <Text style={styles.label} pointerEvents="none">Start Time</Text>
                        <TouchableOpacity
                          style={styles.dateTimePicker}
                          onPress={() => {
                            setShowStartTimePicker(!showStartTimePicker);
                            setShowEndTimePicker(false);
                            setShowEventPicker(false);
                            Keyboard.dismiss();
                          }}
                        >
                          <Text style={styles.dateTimeText}>
                            {newTaskStartTime
                              ? new Date(newTaskStartTime).toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : (newTaskScheduled === "periodic"
                                  ? "Select Start Time (hh:mm)"
                                  : "Select Start Date & Time")}
                          </Text>
                        </TouchableOpacity>
                        {showStartTimePicker && (
                          <DateTimePicker
                            value={
                              newTaskStartTime
                                ? new Date(newTaskStartTime)
                                : new Date()
                            }
                            mode={newTaskScheduled === "periodic" ? "time" : "datetime"}
                            display="spinner"
                            maximumDate={newTaskEndTime && newTaskScheduled !== "periodic" ? new Date(newTaskEndTime) : undefined}
                            onChange={(event, selectedDate) => {
                              if (selectedDate) {
                                setNewTaskStartTime(selectedDate.toISOString());
                                if (newTaskEndTime && new Date(selectedDate) > new Date(newTaskEndTime)) {
                                  setNewTaskEndTime(selectedDate.toISOString());
                                }
                              }
                            }}
                          />
                        )}
                      </View>
                    )}

                    {/* More 按钮展开后显示其余表单项 */}
                    {showMoreFields && (
                      <>
                        {/* Scheduled 下拉选择 - 统一下拉菜单风格 */}
                        <View style={{ marginBottom: 12 }}>
                          <Text style={styles.label}>Scheduled</Text>
                          <View>
                            <TouchableOpacity
                              style={styles.detailPickerTouchable}
                              onPress={() =>
                                setOpenDropdown(
                                  openDropdown === "scheduled" ? null : "scheduled"
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: newTaskScheduled ? "#222" : "#888" }}>
                                {SCHEDULED_OPTIONS.find(
                                  (opt) => opt.value === newTaskScheduled
                                )?.label || "(Select type)"}
                              </Text>
                              <AntDesign name="down" size={16} color="#555" />
                            </TouchableOpacity>
                            {openDropdown === "scheduled" && (
                              <View style={styles.detailPickerDropdown}>
                                {SCHEDULED_OPTIONS.map((opt) => (
                                  <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                      styles.detailPickerOption,
                                      newTaskScheduled === opt.value && {
                                        backgroundColor: "#e6f0ff",
                                      },
                                    ]}
                                    onPress={() => {
                                      setNewTaskScheduled(opt.value);
                                      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
                                      setShowDatePicker(false);
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    <Text style={{ color: "#222" }}>{opt.label}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>

                                                {/* Start Time - 默认 one-time 时和 periodic 时都显示（未展开 More 也显示） */}
                        {(!showMoreFields || newTaskScheduled === "onetime" || newTaskScheduled === "periodic") && (
                          <View style={styles.dateTimeContainer} pointerEvents="box-none">
                            <Text style={styles.label} pointerEvents="none">Start Time</Text>
                            <TouchableOpacity
                              style={styles.dateTimePicker}
                              onPress={() => {
                                setShowStartTimePicker(!showStartTimePicker);
                                setShowEndTimePicker(false);
                                setShowEventPicker(false);
                                Keyboard.dismiss();
                              }}
                            >
                              <Text style={styles.dateTimeText}>
                                {newTaskStartTime
                                  ? new Date(newTaskStartTime).toLocaleString("en-US", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    })
                                  : (newTaskScheduled === "periodic"
                                      ? "Select Start Time (hh:mm)"
                                      : "Select Start Date & Time")}
                              </Text>
                            </TouchableOpacity>
                            {showStartTimePicker && (
                              <DateTimePicker
                                value={
                                  newTaskStartTime
                                    ? new Date(newTaskStartTime)
                                    : new Date()
                                }
                                mode={newTaskScheduled === "periodic" ? "time" : "datetime"}
                                display="spinner"
                                maximumDate={newTaskEndTime && newTaskScheduled !== "periodic" ? new Date(newTaskEndTime) : undefined}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    setNewTaskStartTime(selectedDate.toISOString());
                                    if (newTaskEndTime && new Date(selectedDate) > new Date(newTaskEndTime)) {
                                      setNewTaskEndTime(selectedDate.toISOString());
                                    }
                                  }
                                }}
                              />
                            )}
                          </View>
                        )}
                        

                        {/* End Time 只在 periodic 时显示，finishedby 为 datetime picker，periodic 为 time picker */}
                        {(newTaskScheduled === "periodic") && (
                          <View style={styles.dateTimeContainer} pointerEvents="box-none">
                            <Text style={styles.label} pointerEvents="none">End Time</Text>
                            <TouchableOpacity
                              style={styles.dateTimePicker}
                              onPress={() => {
                                setShowEndTimePicker(!showEndTimePicker);
                                setShowStartTimePicker(false);
                                setShowEventPicker(false);
                                Keyboard.dismiss();
                              }}
                            >
                              <Text style={styles.dateTimeText}>
                                {newTaskEndTime
                                  ? (newTaskScheduled === "periodic"
                                      ? new Date(newTaskEndTime).toLocaleTimeString(
                                          "en-US",
                                          {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                          }
                                        )
                                      : new Date(newTaskEndTime).toLocaleString(
                                          "en-US",
                                          {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                          }
                                        )
                                    )
                                  : (newTaskScheduled === "periodic"
                                      ? "Select End Time (hh:mm)"
                                      : "Select End Date & Time")}
                              </Text>
                            </TouchableOpacity>
                            {showEndTimePicker && (
                              <DateTimePicker
                                value={
                                  newTaskEndTime
                                    ? new Date(newTaskEndTime)
                                    : new Date()
                                }
                                mode={newTaskScheduled === "periodic" ? "time" : "datetime"}
                                display="spinner"
                                minimumDate={newTaskScheduled === "finishedby" ? (newTaskStartTime ? new Date(newTaskStartTime) : undefined) : undefined}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    setNewTaskEndTime(selectedDate.toISOString());
                                  }
                                }}
                              />
                            )}
                          </View>
                        )}
                        {/* End Time - 只在 one-time/finishedby 时显示 */}
                        {showMoreFields && (newTaskScheduled === "onetime" || newTaskScheduled === "finishedby") && (
                          <View style={styles.dateTimeContainer} pointerEvents="box-none">
                            <Text style={styles.label} pointerEvents="none">End Time</Text>
                            <TouchableOpacity
                              style={styles.dateTimePicker}
                              onPress={() => {
                                setShowEndTimePicker(!showEndTimePicker);
                                setShowStartTimePicker(false);
                                setShowEventPicker(false);
                                Keyboard.dismiss();
                              }}
                            >
                              <Text style={styles.dateTimeText}>
                                {newTaskEndTime
                                  ? new Date(newTaskEndTime).toLocaleString("en-US", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    })
                                  : "Select End Date & Time"}
                              </Text>
                            </TouchableOpacity>
                            {showEndTimePicker && (
                              <DateTimePicker
                                value={
                                  newTaskEndTime
                                    ? new Date(newTaskEndTime)
                                    : new Date()
                                }
                                mode="datetime"
                                display="spinner"
                                minimumDate={newTaskStartTime ? new Date(newTaskStartTime) : undefined}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    setNewTaskEndTime(selectedDate.toISOString());
                                  }
                                }}
                              />
                            )}
                          </View>
                        )}
                        {/* Frequency 只在 periodic 下，并且在 Start Time 之后 */}
                        {showMoreFields && newTaskScheduled === "periodic" && (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={styles.label}>Frequency</Text>
                            <View>
                              <TouchableOpacity
                                style={styles.detailPickerTouchable}
                                onPress={() => {
                                  setOpenDropdown(openDropdown === "freq" ? null : "freq");
                                  setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                  }, 200);
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={{ color: newTaskScheduledParam.type ? "#222" : "#888" }}>
                                  {["daily", "weekly", "monthly", "yearly"].find(
                                    (opt) => opt === newTaskScheduledParam.type
                                  )
                                    ?.replace(/^./, (c) => c.toUpperCase()) ||
                                    "Select frequency"}
                                </Text>
                                <AntDesign name="down" size={16} color="#555" />
                              </TouchableOpacity>
                              {openDropdown === "freq" && (
                                <View style={styles.detailPickerDropdown}>
                                  {["daily", "weekly", "monthly", "yearly"].map(
                                    (opt) => (
                                      <TouchableOpacity
                                        key={opt}
                                        style={[
                                          styles.detailPickerOption,
                                          newTaskScheduledParam.type === opt && {
                                            backgroundColor: "#e6f0ff",
                                          },
                                        ]}
                                        onPress={() => {
                                          setNewTaskScheduledParam({ type: opt, daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        <Text style={{ color: "#222" }}>
                                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </Text>
                                      </TouchableOpacity>
                                    )
                                  )}
                                </View>
                              )}
                            </View>
                            {/* 动态渲染 frequency 相关参数 */}
                            {newTaskScheduledParam.type === "weekly" && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>Repeat on</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, idx) => (
                                    <TouchableOpacity
                                      key={day}
                                      style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 14,
                                        borderRadius: 8,
                                        margin: 4,
                                        backgroundColor: Array.isArray(newTaskScheduledParam.daysOfWeek) && newTaskScheduledParam.daysOfWeek.includes(idx) ? '#4a90e2' : '#f0f0f0',
                                      }}
                                      onPress={() => {
                                        let arr = Array.isArray(newTaskScheduledParam.daysOfWeek) ? [...newTaskScheduledParam.daysOfWeek] : [];
                                        if (arr.includes(idx)) {
                                          arr = arr.filter(i => i !== idx);
                                        } else {
                                          arr.push(idx);
                                        }
                                        setNewTaskScheduledParam({ ...newTaskScheduledParam, daysOfWeek: arr });
                                      }}
                                    >
                                      <Text style={{ color: Array.isArray(newTaskScheduledParam.daysOfWeek) && newTaskScheduledParam.daysOfWeek.includes(idx) ? '#fff' : '#333' }}>{day}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            )}
                            {newTaskScheduledParam.type === "monthly" && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>Repeat on Day(s)</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxHeight: 120 }}>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                    <TouchableOpacity
                                      key={d}
                                      style={{
                                        paddingVertical: 6,
                                        paddingHorizontal: 10,
                                        borderRadius: 8,
                                        margin: 2,
                                        backgroundColor: Array.isArray(newTaskScheduledParam.daysOfMonth) && newTaskScheduledParam.daysOfMonth.includes(d) ? '#4a90e2' : '#f0f0f0',
                                      }}
                                      onPress={() => {
                                        let arr = Array.isArray(newTaskScheduledParam.daysOfMonth) ? [...newTaskScheduledParam.daysOfMonth] : [];
                                        if (arr.includes(d)) {
                                          arr = arr.filter(i => i !== d);
                                        } else {
                                          arr.push(d);
                                        }
                                        setNewTaskScheduledParam({ ...newTaskScheduledParam, daysOfMonth: arr });
                                      }}
                                    >
                                      <Text style={{ color: Array.isArray(newTaskScheduledParam.daysOfMonth) && newTaskScheduledParam.daysOfMonth.includes(d) ? '#fff' : '#333' }}>{d}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            )}
                            {newTaskScheduledParam.type === "yearly" && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>Repeat on Date</Text>
                                <TouchableOpacity
                                  style={styles.dateTimePicker}
                                  onPress={() => setShowDatePicker(!showDatePicker)}
                                >
                                  <Text style={styles.dateTimeText}>
                                    {newTaskScheduledParam.dateOfYear
                                      ? new Date(newTaskScheduledParam.dateOfYear).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
                                      : 'Select Date'}
                                  </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                  <DateTimePicker
                                    value={newTaskScheduledParam.dateOfYear ? new Date(newTaskScheduledParam.dateOfYear) : new Date()}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                      if (selectedDate) {
                                        setNewTaskScheduledParam({ ...newTaskScheduledParam, dateOfYear: selectedDate.toISOString() });
                                        setShowDatePicker(false);
                                      }
                                    }}
                                  />
                                )}
                              </View>
                            )}
                          </View>
                        )}
                        {/* Belong to Goal Picker - 统一下拉菜单风格 */}
                        <View style={{ marginBottom: 12, position: "relative" }}>
                          <Text style={styles.label}>Belong to Goal</Text>
                          <View>
                            <TouchableOpacity
                              style={styles.detailPickerTouchable}
                              onPress={() =>
                                setOpenDropdown(
                                  openDropdown === "belong" ? null : "belong"
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: selectedGoalId ? "#222" : "#888" }}>
                                {goals.find((g) => g.id === selectedGoalId)
                                  ?.name || "None"}
                              </Text>
                              <AntDesign name="down" size={16} color="#555" />
                            </TouchableOpacity>
                            {openDropdown === "belong" && (
                              <View style={styles.detailPickerDropdown}>
                                <TouchableOpacity
                                  style={styles.detailPickerOption}
                                  onPress={() => {
                                    setSelectedGoalId(undefined);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <Text style={{ color: "#222" }}>None</Text>
                                </TouchableOpacity>
                                {goals.map((goal) => (
                                  <TouchableOpacity
                                    key={goal.id}
                                    style={[
                                      styles.detailPickerOption,
                                      selectedGoalId === goal.id && {
                                        backgroundColor: "#e6f0ff",
                                      },
                                    ]}
                                    onPress={() => {
                                      setSelectedGoalId(goal.id);
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    <Text style={{ color: "#222" }}>
                                      {goal.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                        {/* Tag Picker - 自定义下拉菜单，支持 None 选项，数据来自后端 */}
                        <View style={styles.dateTimeContainer}>
                          <Text style={styles.label}>Tag (Optional)</Text>
                          <View>
                            <TouchableOpacity
                              style={styles.detailPickerTouchable}
                              onPress={() =>
                                setOpenDropdown(
                                  openDropdown === "tag" ? null : "tag"
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: newTaskEvent ? "#222" : "#888" }}>
                                {tagList.find(t => t.name === newTaskEvent)?.name || "None"}
                              </Text>
                              <AntDesign name="down" size={16} color="#555" />
                            </TouchableOpacity>
                            {openDropdown === "tag" && (
                              <View style={styles.detailPickerDropdown}>
                                <TouchableOpacity
                                  style={[
                                    styles.detailPickerOption,
                                    !newTaskEvent && { backgroundColor: "#e6f0ff" },
                                  ]}
                                  onPress={() => {
                                    setNewTaskEvent("");
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <Text style={{ color: "#222" }}>None</Text>
                                </TouchableOpacity>
                                {tagList.map((tag) => (
                                  <TouchableOpacity
                                    key={tag.id}
                                    style={[
                                      styles.detailPickerOption,
                                      newTaskEvent === tag.name && {
                                        backgroundColor: "#e6f0ff",
                                      },
                                    ]}
                                    onPress={() => {
                                      setNewTaskEvent(tag.name);
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    <Text style={{ color: "#222" }}>{tag.name}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                        {/* Details Section */}
                        <View style={[styles.detailContainer, { marginBottom: 12 }]}> 
                          <Text style={styles.label}>Details</Text>
                          {details.map((detail, index) => (
                            <View key={index} style={styles.detailRow}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <TouchableOpacity
                                  style={styles.detailPickerTouchable}
                                  onPress={() =>
                                    setOpenDropdown(
                                      openDropdown === `detail-${index}`
                                        ? null
                                        : `detail-${index}`
                                    )
                                  }
                                  activeOpacity={0.8}
                                >
                                  <Text
                                    style={{
                                      color: detail.key ? "#222" : "#888",
                                    }}
                                  >
                                    {detail.key || "Select Attribute"}
                                  </Text>
                                  <AntDesign
                                    name="down"
                                    size={16}
                                    color="#555"
                                    style={{ marginLeft: 6 }}
                                  />
                                </TouchableOpacity>
                                {openDropdown === `detail-${index}` && (
                                  <View style={styles.detailPickerDropdown}>
                                    {availableAttributes.map((attr) => (
                                      <TouchableOpacity
                                        key={attr}
                                        style={[
                                          styles.detailPickerOption,
                                          detail.key === attr && {
                                            backgroundColor: "#e6f0ff",
                                          },
                                          !details.some(
                                            (d, i) =>
                                              d.key === attr && i !== index
                                          )
                                            ? null
                                            : { opacity: 0.5 },
                                        ]}
                                        disabled={details.some(
                                          (d, i) =>
                                            d.key === attr && i !== index
                                        )}
                                        onPress={() => {
                                          const updatedDetails = [...details];
                                          updatedDetails[index].key = attr;
                                          setDetails(updatedDetails);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        <Text style={{ color: "#222" }}>
                                          {attr}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                              </View>
                              <TextInput
                                style={styles.detailValueInput}
                                placeholder="Enter value (e.g. https://..., 10, description)"
                                value={detail.value}
                                onChangeText={(text) => {
                                  const updatedDetails = [...details];
                                  updatedDetails[index].value = text;
                                  setDetails(updatedDetails);
                                }}
                                maxLength={100}
                              />
                              <TouchableOpacity
                                style={styles.deleteDetailButton}
                                onPress={() => {
                                  setDetails(
                                    details.filter((_, i) => i !== index)
                                  );
                                }}
                              >
                                <AntDesign
                                  name="closecircleo"
                                  size={22}
                                  color="#bbb"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                          <Pressable
                            style={styles.addDetailButton}
                            onPress={() => {
                              setDetails([...details, { key: "", value: "" }]);
                            }}
                          >
                            <Text style={[styles.addDetailButtonText]}>
                              + Add Detail
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}

                    {/* Add Task Button */}
                    <View style={styles.buttonRow}>
                      <Pressable
                        style={[
                          styles.button,
                          styles.addButton,
                          { flex: 1, marginRight: 8 },
                        ]}
                        onPress={() => {
                          if (!newTaskName.trim()) {
                            Alert.alert("Error", "Task name cannot be empty.");
                            return;
                          }
                          // startTime 可选，未选时用当前时间
                          const startTime = newTaskStartTime
                            ? new Date(newTaskStartTime)
                            : new Date();
                          const endTime = newTaskEndTime
                            ? new Date(newTaskEndTime)
                            : new Date(
                                startTime.getFullYear(),
                                startTime.getMonth(),
                                startTime.getDate(),
                                23,
                                59
                              );
                          const newTask = {
                            id: scheduleData.length + 1,
                            goal: 1,
                            name: newTaskName,
                            startTime: startTime.toISOString(),
                            endTime: endTime.toISOString(),
                            tag: mockEventTags.includes(newTaskEvent)
                              ? newTaskEvent
                              : "Untagged",
                            details: details.reduce((acc: Record<string, any>, detail) => {
                              acc[detail.key] = detail.value;
                              return acc;
                            }, {}),
                            goalId: selectedGoalId ?? 0,
                            completed: null,
                            scheduled: newTaskScheduled,
                            scheduledParam: newTaskScheduled === "periodic" ? newTaskScheduledParam : {},
                          };
                          addToScheduleData(newTask);
                          resetModalFields();
                          setModalVisible(false);
                        }}
                      >
                        <Text style={styles.buttonText}>Add Task</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.moreButton, { flex: 1 }]}
                        onPress={() => setShowMoreFields(!showMoreFields)}
                      >
                        <Text style={styles.moreButtonText}>
                          {showMoreFields ? "Hide More" : "More"}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Close Modal Button (X at top right) */}
                    <TouchableOpacity
                      style={styles.closeIcon}
                      onPress={() => {
                        resetModalFields();
                        setModalVisible(false);
                      }}
                    >
                      <Text style={{ fontSize: 28, color: "#888" }}>×</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>