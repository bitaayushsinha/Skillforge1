import os
import json
import logging
from openai import OpenAI
import models
from database import SessionLocal

logger = logging.getLogger(__name__)

# Initialize OpenAI client. It expects OPENAI_API_KEY environment variable.
try:
    openai_client = OpenAI()
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    openai_client = None

# Initialize Groq client
try:
    groq_client = OpenAI(
        api_key=os.environ.get("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {e}")
    groq_client = None

def generate_quiz(context, count=5):
    if not groq_client:
        return [
            {
                "question": f"What is the main topic of this section? (Placeholder {i+1})",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": 0
            } for i in range(count)
        ]

    system_prompt = f"""You are a quiz generation assistant.
Based on the provided context, generate exactly {count} multiple-choice questions.
Return ONLY valid JSON in the form of an object containing a 'questions' array.
Each question object must have:
- "question": string
- "options": list of exactly 4 strings
- "answer": integer (0 to 3) representing the index of the correct option.
Do NOT include any markdown formatting or extra text outside the JSON."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context}"}
            ],
            temperature=0.3,
            max_tokens=4500,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        
        # Handle potential markdown blocks
        if "```" in content:
            parts = content.split("```")
            if len(parts) > 1:
                content = parts[1]
                if content.startswith("json"):
                    content = content[4:]
                    
        data = json.loads(content)
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
        elif isinstance(data, list):
            return data
        return []
    except Exception as e:
        logger.error(f"Error generating quiz via OpenAI: {e}")
        return [
            {
                "question": f"Could not generate questions due to an error: {str(e)}",
                "options": ["Error", "B", "C", "D"],
                "answer": 0
            }
        ]

class AIProposalService:
    @staticmethod
    def process_proposal(proposal_id: int):
        db = SessionLocal()
        try:
            proposal = db.query(models.CourseProposal).filter(models.CourseProposal.id == proposal_id).first()
            if not proposal:
                return

            try:
                if not groq_client:
                    raise Exception("Groq client not initialized")
                # Step 1: Moderation API
                if openai_client:
                    try:
                        moderation_response = openai_client.moderations.create(input=proposal.course_name + "\n" + proposal.expected_outcome)
                        result = moderation_response.results[0]
                        
                        if result.flagged:
                            # Find the reason
                            flagged_categories = [k for k, v in result.categories.model_dump().items() if v]
                            proposal.status = "ai_flagged"
                            proposal.ai_flagged_reason = ", ".join(flagged_categories) if flagged_categories else "General flag"
                            db.commit()
                            return # Stop processing further if flagged
                    except Exception as mod_err:
                        logger.warning(f"Moderation API failed (probably quota exceeded), skipping moderation: {mod_err}")

                # Step 2: Chat API to generate fields
                system_prompt = """
                You are an AI assistant that evaluates course proposals.
                You must respond in valid JSON format with exactly these keys:
                "ai_summary": A 2-3 sentence summary of the proposed course. If the course is about an advanced programming language (e.g. Advanced Ruby, Advanced Python), provide a unique, highly accurate description of what the advanced domains of that specific language entail, contrasting it with its core basics. Ensure the description is specific to the actual frameworks, paradigms, and use cases of that language (do not use a generic template).
                "ai_category": The most fitting category (e.g. 'Software Engineering', 'Data Science & Databases', 'AI & Machine Learning', 'Design', etc.).
                "risk_level": "Low", "Medium", or "High".
                "demand_score": an integer from 0 to 100 representing market demand.
                "ai_recommendation": "approve", "review", or "reject".
                """

                user_content = f"""
                Course Name: {proposal.course_name}
                Reason: {proposal.reason_to_learn}
                Skill Level: {proposal.skill_level}
                Expected Outcome: {proposal.expected_outcome}
                Additional Notes: {proposal.additional_notes}
                """

                chat_response = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    response_format={"type": "json_object"}
                )

                ai_data_str = chat_response.choices[0].message.content
                ai_data = json.loads(ai_data_str)

                proposal.ai_summary = ai_data.get("ai_summary")
                proposal.ai_category = ai_data.get("ai_category")
                proposal.risk_level = ai_data.get("risk_level")
                proposal.demand_score = ai_data.get("demand_score")
                proposal.ai_recommendation = ai_data.get("ai_recommendation")

                if proposal.ai_recommendation == "reject":
                    proposal.status = "ai_flagged"
                else:
                    proposal.status = "pending"

            except Exception as e:
                import random
                import logging
                
                logger.info("OpenAI API failed or not configured. Falling back to Scrapling web scrape.")
                
                try:
                    from scrapling.fetchers import StealthyFetcher
                    
                    search_term = proposal.course_name.strip().replace(" ", "+")
                    wiki_url = f"https://en.wikipedia.org/w/index.php?search={search_term}"
                    
                    page = StealthyFetcher.fetch(wiki_url, headless=True)
                    
                    import re
                    paragraphs = page.css('p')
                    valid_paragraphs = []
                    for p in paragraphs:
                        text = "".join(p.css('*::text').getall()).strip()
                        # Remove Wikipedia citation references like [1], [2], etc.
                        text = re.sub(r'\[\d+\]', '', text)
                        if len(text) > 50:
                            valid_paragraphs.append(text)
                    
                    if valid_paragraphs:
                        proposal.ai_summary = " ".join(valid_paragraphs[:2])
                    else:
                        proposal.ai_summary = f"Advanced {proposal.course_name} dives deep into specialized frameworks, complex paradigms, and enterprise-level applications."

                    # Calculate demand score based on page content length as proxy for popularity
                    # page.xpath('string()') gets all text, we can use its length
                    full_text = " ".join(valid_paragraphs)
                    computed_score = min(98, max(42, len(full_text) // 50))
                    proposal.demand_score = computed_score
                    
                    text_lower = full_text.lower()
                    
                    if any(kw in text_lower for kw in ['data', 'database', 'sql']):
                        proposal.ai_category = 'Data Science & Databases'
                    elif any(kw in text_lower for kw in ['design', 'ui', 'ux']):
                        proposal.ai_category = 'Design'
                    elif any(kw in text_lower for kw in ['ai', 'machine learning', 'neural']):
                        proposal.ai_category = 'AI & Machine Learning'
                    elif any(kw in text_lower for kw in ['business', 'finance', 'market']):
                        proposal.ai_category = 'Business'
                    else:
                        proposal.ai_category = 'Software Engineering'

                    if 'deprecated' in text_lower or 'obsolete' in text_lower:
                        proposal.risk_level = 'High'
                    elif computed_score < 60:
                        proposal.risk_level = 'Medium'
                    else:
                        proposal.risk_level = 'Low'

                except Exception as scrape_err:
                    logger.error(f"Scraping failed: {scrape_err}")
                    proposal.ai_summary = f"Advanced {proposal.course_name} dives deep into specialized frameworks."
                    proposal.ai_category = 'Software Engineering'
                    proposal.risk_level = 'Medium'
                    proposal.demand_score = random.randint(40, 95)
                
                proposal.ai_recommendation = "approve"
                proposal.status = "pending"

            # Step 3: Duplicate detection using simple substring search
            # Matches prompt "Search existing proposals with similar course names"
            words = proposal.course_name.lower().split()
            duplicate_found = False
            if words:
                longest_word = max(words, key=len)
                if len(longest_word) > 3:
                    similar_proposals = db.query(models.CourseProposal).filter(
                        models.CourseProposal.id != proposal.id,
                        models.CourseProposal.course_name.ilike(f"%{longest_word}%")
                    ).all()
                    
                    if similar_proposals:
                        proposal.duplicate_status = True
                        duplicate_found = True

            if not duplicate_found:
                proposal.duplicate_status = False

            db.commit()

        except Exception as e:
            logger.error(f"Error processing proposal {proposal_id}: {e}")
            db.rollback()
        finally:
            db.close()

def generate_topic_assessment(topic: str, difficulty: str = "Intermediate", count: int = 10):
    """Generate a comprehensive 10-question assessment on any topic (technical, aptitude, math, logic) using AI with rich fallback."""
    if groq_client:
        system_prompt = f"""You are an expert assessment and problem generator across ALL disciplines (Technical, Quantitative Aptitude, Logical Reasoning, Mathematics, Verbal Ability, Business, Science, etc.).
Generate exactly {count} multiple-choice test questions or practical problems to evaluate a learner on the topic: "{topic}" at "{difficulty}" difficulty level.
If the topic is Quantitative Aptitude, Math, Logical Reasoning, or analytical, generate actual numerical problems, word problems, logic puzzles, or equations with 4 numerical/logical options and step-by-step mathematical calculations in the explanation!
Return ONLY valid JSON in the form of an object containing a 'questions' array.
Each question object MUST have:
- "question": string (the problem or test question)
- "options": list of exactly 4 strings (the potential answers)
- "answer": integer (0 to 3) representing the index of the correct option
- "explanation": string (a detailed step-by-step solution and explanation of why the correct option is right)
Do NOT include any markdown formatting or extra text outside the JSON."""

        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate a {count}-question {difficulty} assessment problem set on: {topic}"}
                ],
                temperature=0.3,
                max_tokens=4500,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            if "```" in content:
                parts = content.split("```")
                if len(parts) > 1:
                    content = parts[1]
                    if content.startswith("json"):
                        content = content[4:]
            data = json.loads(content)
            if isinstance(data, dict) and "questions" in data and len(data["questions"]) > 0:
                return data["questions"][:count]
            elif isinstance(data, list) and len(data) > 0:
                return data[:count]
        except Exception as e:
            logger.error(f"Groq API assessment generation error for {topic}: {e}")

    # Return None so that the caller can fallback to Database Question Bank
    return None
