import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  FileText,
  Video,
  FileCode,
  Database,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Upload,
  BookOpen,
  ChevronDown,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function CurriculumManagerScreen() {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'banks'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [materials, setMaterials] = useState([]);

  const [questionBanks, setQuestionBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Modal states
  const [materialModal, setMaterialModal] = useState(false);
  const [matForm, setMatForm] = useState({ title: '', type: 'text', text_content: '' });
  const [savingMat, setSavingMat] = useState(false);

  const [bankModal, setBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({ name: '', code: '', category: 'General Tech' });
  const [savingBank, setSavingBank] = useState(false);

  const [questionModal, setQuestionModal] = useState(false);
  const [qForm, setQForm] = useState({
    text: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correct_answer: '0',
    explanation: '',
  });
  const [savingQ, setSavingQ] = useState(false);

  const fetchTabMetrics = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === 'materials') {
        const coursesRes = await api.get('/api/expert/courses').catch(() => ({ data: [] }));
        const list = coursesRes.data || [];
        setCourses(list);
        const cid = selectedCourseId || (list.length > 0 ? list[0].id : null);
        if (cid && !selectedCourseId) setSelectedCourseId(cid);

        if (cid) {
          const matsRes = await api.get(`/api/expert/courses/${cid}/materials`).catch(() => ({ data: [] }));
          setMaterials(matsRes.data || []);
        } else {
          setMaterials([]);
        }
      } else {
        const banksRes = await api.get('/api/exam-banks/').catch(() => ({ data: [] }));
        const list = banksRes.data || [];
        setQuestionBanks(list);
        const bid = selectedBankId || (list.length > 0 ? list[0].id : null);
        if (bid && !selectedBankId) setSelectedBankId(bid);

        if (bid) {
          const qRes = await api.get(`/api/exam-banks/${bid}/questions`).catch(() => ({ data: [] }));
          setQuestions(qRes.data || []);
        } else {
          setQuestions([]);
        }
      }
    } catch (err) {
      console.error('Error fetching curriculum data:', err);
      setError('Could not load curriculum resources.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedCourseId, selectedBankId]);

  useEffect(() => {
    setLoading(true);
    fetchTabMetrics();
  }, [fetchTabMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTabMetrics();
  };

  const handleSelectCourse = async (cid) => {
    setSelectedCourseId(cid);
    setLoading(true);
    try {
      const matsRes = await api.get(`/api/expert/courses/${cid}/materials`);
      setMaterials(matsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBank = async (bid) => {
    setSelectedBankId(bid);
    setLoading(true);
    try {
      const qRes = await api.get(`/api/exam-banks/${bid}/questions`);
      setQuestions(qRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async () => {
    if (!selectedCourseId || !matForm.title.trim() || !matForm.text_content.trim()) {
      Alert.alert('Validation Error', 'Title and Content/Link are required.');
      return;
    }
    try {
      setSavingMat(true);
      const formData = new FormData();
      formData.append('title', matForm.title.trim());
      formData.append('type', matForm.type);
      formData.append('text_content', matForm.text_content.trim());

      await api.post(`/api/expert/courses/${selectedCourseId}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMaterialModal(false);
      setMatForm({ title: '', type: 'text', text_content: '' });
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to upload study material.');
    } finally {
      setSavingMat(false);
    }
  };

  const handleCreateBank = async () => {
    if (!bankForm.name.trim()) return;
    try {
      setSavingBank(true);
      await api.post('/api/exam-banks/', {
        name: bankForm.name.trim(),
        code: bankForm.code.trim() || undefined,
        category: bankForm.category || 'General Tech',
      });
      setBankModal(false);
      setBankForm({ name: '', code: '', category: 'General Tech' });
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create question bank.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleUploadQuestion = async () => {
    if (!selectedBankId || !qForm.text.trim() || !qForm.opt0.trim() || !qForm.opt1.trim()) {
      Alert.alert('Validation Error', 'Question text and at least 2 options (A & B) are required.');
      return;
    }
    try {
      setSavingQ(true);
      const options = [qForm.opt0.trim(), qForm.opt1.trim()];
      if (qForm.opt2.trim()) options.push(qForm.opt2.trim());
      if (qForm.opt3.trim()) options.push(qForm.opt3.trim());

      const payload = [
        {
          text: qForm.text.trim(),
          options: options,
          correct_answer: Math.min(parseInt(qForm.correct_answer, 10) || 0, options.length - 1),
          explanation: qForm.explanation.trim() || 'Industrial curriculum verified answer.',
        },
      ];

      const res = await api.post(`/api/exam-banks/${selectedBankId}/questions/upload`, payload);
      if (res.data?.success) {
        setQuestionModal(false);
        setQForm({ text: '', opt0: '', opt1: '', opt2: '', opt3: '', correct_answer: '0', explanation: '' });
        fetchTabMetrics();
      } else {
        Alert.alert('Upload Error', res.data?.errors?.join('\n') || 'Could not validate question item.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add question.');
    } finally {
      setSavingQ(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Study & Exam Resources" subtitle="Materials & Question Banks" />

      {/* Top Switcher */}
      <View style={styles.navContainer}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, activeTab === 'materials' && styles.navBtnActive]}
            onPress={() => setActiveTab('materials')}
          >
            <FileText size={16} color={activeTab === 'materials' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'materials' && styles.navTextActive]}>Course Materials</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, activeTab === 'banks' && styles.navBtnActive]}
            onPress={() => setActiveTab('banks')}
          >
            <Database size={16} color={activeTab === 'banks' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'banks' && styles.navTextActive]}>Question Banks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector & Add bar */}
      <View style={styles.actionHeader}>
        {activeTab === 'materials' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {courses.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.selectPill, selectedCourseId === c.id && styles.selectPillActive]}
                onPress={() => handleSelectCourse(c.id)}
              >
                <Text style={[styles.selectPillText, selectedCourseId === c.id && { color: '#ffffff', fontWeight: '800' }]}>
                  {c.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {questionBanks.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.selectPill, selectedBankId === b.id && styles.selectPillActive]}
                onPress={() => handleSelectBank(b.id)}
              >
                <Text style={[styles.selectPillText, selectedBankId === b.id && { color: '#ffffff', fontWeight: '800' }]}>
                  {b.name} ({b.code || 'NO-CODE'})
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addBankPill} onPress={() => setBankModal(true)}>
              <Plus size={14} color="#8b5cf6" />
              <Text style={styles.addBankText}>New Bank</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <View style={styles.subActionRow}>
        <Text style={styles.listTitle}>
          {activeTab === 'materials'
            ? `Materials (${materials.length})`
            : `Bank Questions (${questions.length})`}
        </Text>
        {activeTab === 'materials' && selectedCourseId ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setMaterialModal(true)}>
            <Plus size={16} color="#ffffff" />
            <Text style={styles.addBtnText}>Add Material</Text>
          </TouchableOpacity>
        ) : activeTab === 'banks' && selectedBankId ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setQuestionModal(true)}>
            <Plus size={16} color="#ffffff" />
            <Text style={styles.addBtnText}>Add Question</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading resources...</Text>
          </View>
        ) : activeTab === 'materials' ? (
          materials.length === 0 ? (
            <View style={styles.emptyCard}>
              <FileText size={36} color="#64748b" />
              <Text style={styles.emptyTitle}>No Materials Uploaded</Text>
              <Text style={styles.emptySubtext}>Upload study notes, video lectures, and industrial references.</Text>
            </View>
          ) : (
            materials.map((m) => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                    {m.type === 'video' ? <Video size={18} color="#f59e0b" /> : <FileText size={18} color="#38bdf8" />}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.itemTitle}>{m.title}</Text>
                    <Text style={styles.itemType}>{m.type?.toUpperCase()} RESOURCE</Text>
                  </View>
                </View>
                {m.text_content ? <Text style={styles.contentText} numberOfLines={3}>{m.text_content}</Text> : null}
              </View>
            ))
          )
        ) : questions.length === 0 ? (
          <View style={styles.emptyCard}>
            <HelpCircle size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Questions in Bank</Text>
            <Text style={styles.emptySubtext}>Add industrial multiple-choice evaluation items for exam slots.</Text>
          </View>
        ) : (
          questions.map((q, idx) => (
            <View key={q.id || idx} style={styles.card}>
              <Text style={styles.qText}>{idx + 1}. {q.text}</Text>
              <View style={styles.optionsList}>
                {q.options?.map((opt, oidx) => {
                  const isCorrect = oidx === q.correct_answer;
                  return (
                    <View key={oidx} style={[styles.optRow, isCorrect && styles.optRowCorrect]}>
                      <Text style={[styles.optLetter, isCorrect && { color: '#10b981' }]}>
                        {['A', 'B', 'C', 'D'][oidx]}:
                      </Text>
                      <Text style={[styles.optText, isCorrect && { color: '#0f172a', fontWeight: '700' }]}>{opt}</Text>
                      {isCorrect ? <Check size={14} color="#10b981" /> : null}
                    </View>
                  );
                })}
              </View>
              {q.explanation ? (
                <View style={styles.explBox}>
                  <Text style={styles.explLabel}>Industrial Rationale:</Text>
                  <Text style={styles.explText}>{q.explanation}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Material Modal */}
      <Modal visible={materialModal} transparent animationType="slide" onRequestClose={() => setMaterialModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Study Resource</Text>
              <TouchableOpacity onPress={() => setMaterialModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Material Title *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Module 1 Architecture Overview" placeholderTextColor="#64748b" value={matForm.title} onChangeText={(t) => setMatForm({ ...matForm, title: t })} />
              <Text style={styles.inputLabel}>Resource Type</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity style={[styles.pillItem, matForm.type === 'text' && styles.pillActive]} onPress={() => setMatForm({ ...matForm, type: 'text' })}><Text style={[styles.pillText, matForm.type === 'text' && { color: '#ffffff', fontWeight: '800' }]}>Text / Notes</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pillItem, matForm.type === 'video' && styles.pillActive]} onPress={() => setMatForm({ ...matForm, type: 'video' })}><Text style={[styles.pillText, matForm.type === 'video' && { color: '#ffffff', fontWeight: '800' }]}>Video Link</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pillItem, matForm.type === 'pdf' && styles.pillActive]} onPress={() => setMatForm({ ...matForm, type: 'pdf' })}><Text style={[styles.pillText, matForm.type === 'pdf' && { color: '#ffffff', fontWeight: '800' }]}>PDF Ref</Text></TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Content / URL / Lecture Notes *</Text>
              <TextInput style={[styles.textInput, { height: 120, textAlignVertical: 'top' }]} placeholder="Type comprehensive notes or paste video stream URL..." placeholderTextColor="#64748b" multiline value={matForm.text_content} onChangeText={(t) => setMatForm({ ...matForm, text_content: t })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMaterialModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateMaterial} disabled={savingMat}>{savingMat ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveText}>Upload Material</Text>}</TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Bank Modal */}
      <Modal visible={bankModal} transparent animationType="fade" onRequestClose={() => setBankModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Question Bank</Text>
              <TouchableOpacity onPress={() => setBankModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Bank Name *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Industrial AI Core Questions" placeholderTextColor="#64748b" value={bankForm.name} onChangeText={(t) => setBankForm({ ...bankForm, name: t })} />
              <Text style={styles.inputLabel}>Bank Code (Optional)</Text>
              <TextInput style={styles.textInput} placeholder="e.g. BANK-AI-901" placeholderTextColor="#64748b" autoCapitalize="characters" value={bankForm.code} onChangeText={(t) => setBankForm({ ...bankForm, code: t.toUpperCase() })} />
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput style={styles.textInput} placeholder="General Tech" placeholderTextColor="#64748b" value={bankForm.category} onChangeText={(t) => setBankForm({ ...bankForm, category: t })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBankModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBank} disabled={savingBank}>{savingBank ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveText}>Create Bank</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Question Modal */}
      <Modal visible={questionModal} transparent animationType="slide" onRequestClose={() => setQuestionModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add MCQ Evaluation Item</Text>
              <TouchableOpacity onPress={() => setQuestionModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Question Stem *</Text>
              <TextInput style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]} placeholder="What is the primary industrial objective of..." placeholderTextColor="#64748b" multiline value={qForm.text} onChangeText={(t) => setQForm({ ...qForm, text: t })} />
              <Text style={styles.inputLabel}>Option A *</Text>
              <TextInput style={styles.textInput} placeholder="First option" placeholderTextColor="#64748b" value={qForm.opt0} onChangeText={(t) => setQForm({ ...qForm, opt0: t })} />
              <Text style={styles.inputLabel}>Option B *</Text>
              <TextInput style={styles.textInput} placeholder="Second option" placeholderTextColor="#64748b" value={qForm.opt1} onChangeText={(t) => setQForm({ ...qForm, opt1: t })} />
              <Text style={styles.inputLabel}>Option C (Optional)</Text>
              <TextInput style={styles.textInput} placeholder="Third option" placeholderTextColor="#64748b" value={qForm.opt2} onChangeText={(t) => setQForm({ ...qForm, opt2: t })} />
              <Text style={styles.inputLabel}>Option D (Optional)</Text>
              <TextInput style={styles.textInput} placeholder="Fourth option" placeholderTextColor="#64748b" value={qForm.opt3} onChangeText={(t) => setQForm({ ...qForm, opt3: t })} />
              <Text style={styles.inputLabel}>Correct Option Index (0=A, 1=B, 2=C, 3=D)</Text>
              <View style={styles.pillRow}>
                {['0 (A)', '1 (B)', '2 (C)', '3 (D)'].map((lbl, idx) => (
                  <TouchableOpacity key={idx} style={[styles.pillItem, qForm.correct_answer === idx.toString() && styles.pillActive]} onPress={() => setQForm({ ...qForm, correct_answer: idx.toString() })}>
                    <Text style={[styles.pillText, qForm.correct_answer === idx.toString() && { color: '#ffffff', fontWeight: '800' }]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Explanation & Industrial Rationale</Text>
              <TextInput style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]} placeholder="Explain why this answer is correct..." placeholderTextColor="#64748b" multiline value={qForm.explanation} onChangeText={(t) => setQForm({ ...qForm, explanation: t })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setQuestionModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUploadQuestion} disabled={savingQ}>{savingQ ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveText}>Save Question</Text>}</TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  navRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  navBtnActive: {
    backgroundColor: '#8b5cf6',
  },
  navText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  actionHeader: {
    marginTop: 12,
  },
  selectorScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  selectPill: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  selectPillActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  selectPillText: {
    color: '#334155',
    fontSize: 13,
  },
  addBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBankText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '700',
  },
  subActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#475569',
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemType: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b5cf6',
    marginTop: 2,
  },
  contentText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 10,
    lineHeight: 18,
  },
  qText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionsList: {
    marginTop: 10,
    gap: 6,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
  },
  optRowCorrect: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  optLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  optText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  explBox: {
    backgroundColor: '#FAF7F2',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  explLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a855f7',
  },
  explText: {
    fontSize: 12,
    color: '#0f172a',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalScroll: {
    padding: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  pillItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pillActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  pillText: {
    color: '#475569',
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAF7F2',
  },
  cancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
