"""Messages about the conversation or the assistant, not about the law.

"Agar men hujjat yuklasam, uni o'zgartirib bera olasanmi?" is a question about
what the assistant can do. It names no code and carries no legal cue, but
"hujjat" sits close enough to statute text that the cosine gate in
pipeline.py sent it to retrieval -- and the answer came back with a
"Manbalar" list of six unrelated articles (Oila kodeksi 228, JPK 99, ...).
The English phrasing was far enough from the corpus to reach chat, so the
same question behaved differently by language.

These messages are recognised here, before retrieval, and answered as a
normal assistant turn. pipeline.py only consults this module when the message
has no article reference, no code name and no legal cue, so "Ish beruvchi
meni ishdan bo'shatdi" can never be diverted by it. Standard library only, so
the gate is unit-tested without the model or the embedding stack.
"""
import re

from corpus_index import norm

# The whole message is a greeting / thanks / farewell (plus "how are you").
_SMALL_TALK = re.compile(
    r"^\s*(?:(?:assalomu? ?alaykum|assalom|salom|salem|hello|hi|hey|"
    r"xayrli (?:kun|tong|kech)|good (?:morning|afternoon|evening)|"
    r"rahmat|katta rahmat|tashakkur|thanks|thank you|xayr|bye|"
    r"qalaysiz|qalaysan|yaxshimisiz|yaxshimisan|how are you|"
    r"привет|здравствуйте|салом|ассалому алайкум|спасибо|рахмат|пока)"
    r"[\s!.,?)(]*)+$",
    re.IGNORECASE)

# Asking whether the assistant is able to do something...
_ABILITY = re.compile(
    r"(\bola(?:san|siz)(?:mi)?\b|\bqila olasan|\bbilasanmi\b|"
    r"\bcan you\b|\bcould you\b|\bare you able\b|\bdo you (?:support|accept)\b|"
    r"можешь|можете|умеешь|умеете|"
    r"ола(?:сан|сиз)(?:ми)?\b)",
    re.IGNORECASE)
# ...with files, documents or text handling -- a product capability question.
_FILE_TASK = re.compile(
    r"(hujjat|fayl|\bfile|document|\bpdf\b|docx|\bword\b|excel|rasm|surat|"
    r"\bmatn|yukla|upload|attach|tahrir|ozgartir|\bedit|\bchange|"
    r"tarjima|translat|"
    r"файл|документ|ҳужжат|хужжат|загруз|юкла|редакт|тахрир|таҳрир|измен|"
    r"ўзгартир|узгартир)",
    re.IGNORECASE)
# Uploading a file needs no ability verb: "Fayl yuklasam boladimi?"
_UPLOAD = re.compile(r"(yukla|upload|attach|загруз|юкла)", re.IGNORECASE)
_FILE_NOUN = re.compile(
    r"(hujjat|fayl|\bfile|document|\bpdf\b|docx|rasm|surat|"
    r"файл|документ|ҳужжат|хужжат)",
    re.IGNORECASE)


def is_meta(question: str) -> bool:
    """True for greetings and questions about the assistant's own abilities."""
    if not question or not question.strip():
        return False
    q = norm(question)
    if _SMALL_TALK.match(q):
        return True
    if _ABILITY.search(q) and _FILE_TASK.search(q):
        return True
    return bool(_UPLOAD.search(q) and _FILE_NOUN.search(q))
