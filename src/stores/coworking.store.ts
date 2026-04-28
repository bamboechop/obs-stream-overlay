import type { Note } from '@/common/interfaces/notes.interface';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCoworkingStore = defineStore('Coworking', () => {
  const myNotes = ref<Note[]>([]);
  const viewerNotes = ref<Note[]>([]);

  const removeNotesFromUser = (displayName: string) => {
    viewerNotes.value = viewerNotes.value.filter(n => n.displayName !== displayName);
  };

  const updateNote = (note: Note) => {
    if (note.status === 'in-progress') {
      if (note.displayName === 'bamboechop') {
        myNotes.value.push(note);
      } else {
        viewerNotes.value.push(note);
      }
    } else {
      if (note.displayName === 'bamboechop') {
        myNotes.value = myNotes.value.filter(n => n.note_id !== note.note_id);
      } else {
        viewerNotes.value = viewerNotes.value.filter(n => n.note_id !== note.note_id);
      }
    }
  };

  const setNotes = (notesToSet: Note[]) => {
    myNotes.value = notesToSet.filter(note => note.displayName === 'bamboechop');
    viewerNotes.value = notesToSet.filter(note => note.displayName !== 'bamboechop');
  };

  return {
    myNotes,
    removeNotesFromUser,
    setNotes,
    updateNote,
    viewerNotes,
  };
}, {
  share: {
    enable: false,
  },
});
