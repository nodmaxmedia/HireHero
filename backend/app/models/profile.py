from ..database import db

class Profile(db.Model):
    __tablename__ = 'profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    phone = db.Column(db.String(20))
    location = db.Column(db.String(120))
    summary = db.Column(db.Text)
    profile_pic = db.Column(db.String(255))
    resume = db.Column(db.String(255))  # Path to uploaded resume file
    views = db.Column(db.Integer, default=0)
    completeness = db.Column(db.Integer, default=0)
    user = db.relationship('User', back_populates='profile')
    experiences = db.relationship('Experience', back_populates='profile', cascade='all, delete-orphan')
    educations = db.relationship('Education', back_populates='profile', cascade='all, delete-orphan')

    def calculate_completeness(self):
        score = 0
        if self.phone:       score += 5   # always present after signup
        if self.location:    score += 10
        if self.summary:     score += 15
        if self.profile_pic: score += 10
        if self.experiences: score += 15
        if hasattr(self, 'educations') and self.educations: score += 15
        # Resume carries the most weight — without it max is 70
        if self.resume:      score += 30

        self.completeness = min(score, 100)
        return self.completeness
